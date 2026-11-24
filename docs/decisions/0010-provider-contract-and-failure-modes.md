# ADR 0010: Provider contract and failure modes

- Status: Accepted
- Date: 2026-11-24

## Context

Until Phase 4 the api had one market data source, Alpaca, and its client was called directly by the bootstrap service. Phase 4 replaces the bootstrap with ingestion that runs by itself: jobs on a queue that load bars and corporate actions every day. Two things follow.

- A job that fails has to know **whether to try again**. "Alpaca is rate limiting" and "the key is wrong" are both an exception from `fetch`; one passes in a minute and the other never does.
- The roadmap names a second source, Yahoo Finance, as the keyless fallback. Yahoo answers the same question in a different language: one ticker per request, prices adjusted for splits, numbers as 32-bit floats, no pay dates.

The constraints are the ones the rest of the data model already has: bars are stored **raw** and adjusted at read time from `corporate_actions`; money is never a float; a session is its New York date.

### Options considered

| Option | Verdict |
|---|---|
| **One interface in the database's conventions, an adapter per provider, one test suite run against every adapter** | **Chosen.** Ingestion and the jobs know one shape. What a provider does differently is the adapter's problem and is tested where it lives. |
| Keep calling the Alpaca client; add Yahoo as a second code path in ingestion | Every caller learns both providers. The next provider is a third `if`. |
| Store what each provider sends (adjusted or not) with a `source` column, reconcile at read time | Moves the difference into every query that reads a bar. Adjusted prices also change retroactively at each split, so stored bars would go stale by themselves. |
| The `yahoo-finance2` library for the Yahoo side | It hands prices over as JavaScript numbers, after `JSON.parse` has already made them floats. The endpoint needed is one GET; the client is written by hand like Alpaca's, with the same exact-number parsing. |

## Decision

### 1. The contract

`MarketDataProvider` (`apps/api/src/market-data/provider/market-data-provider.ts`) has two methods: daily bars for some tickers over a range, a page at a time, and the corporate actions of the same. What comes back is ready to store:

- **Bars are raw**: the prices and volume of the day, not adjusted for anything later.
- **A bar is a session**: its New York date at 00:00 UTC, inside the range (both ends included), one per session, oldest first.
- **Numbers are decimal strings** in plain notation.
- **A split is shares before and shares after; a dividend is the cash per share that was paid**, not divided by a later split. A pay date is null when the source doesn't have one, which settlement already reads as "paid on the ex-date".
- **No data is not an error**: a ticker the provider doesn't know, or one with nothing in the range, is left out.
- **Every failure is a `ProviderError`** with one of four kinds (section 3).

`batchSize` says how many tickers one call should carry (Alpaca 100, Yahoo 1), so the code that cuts a refresh into jobs needs to know nothing else about the provider.

The asset list and the exchange calendar are **not** in the contract. Only Alpaca has them, and the calendar in particular should have one source: it decides when orders fill.

### 2. What each adapter hides

**Alpaca** has little to hide. Its bars endpoint serves raw prices when asked, takes many tickers per request, pages with a token, and leaves out a ticker it doesn't know.

**Yahoo** has a lot:

- **Split adjustment.** Every price is divided, and every volume multiplied, by the ratio of each split after the bar, up to today. The adapter multiplies back by the splits with a later ex-date. The splits inside the requested range come with the bars; the ones after it need a second request (quarterly bars from the end of the range to today, read only for their events). Dividends are divided the same way and are restored the same way.
- **Floats.** A price arrives as the float Yahoo stores, printed in full: `124.80750274658203` for 124.8075. The adapter reads the digits as an exact decimal, undoes the splits, and rounds to the cent (to a hundredth of a cent under a dollar), which is how US stocks quote. A trade printed at a finer price comes out rounded: Yahoo never had the rest.
- **One ticker per request**, class shares spelled with a dash (`BRK-B`), and a **404** for an unknown ticker, which the adapter turns into "no data".
- **No pay dates**: `payDate` is null.

### 3. Failure modes

Decided in one place, `providerGet` (`provider-http.ts`), from what came back:

| Kind | When | Retry? |
|---|---|---|
| `rate_limited` | 429 | Yes, after `Retry-After` when the provider sent one |
| `unavailable` | No answer (network, 30-second timeout), 5xx, 408 | Yes |
| `rejected` | Any other 4xx: bad keys, a plan that doesn't cover the request | No |
| `malformed` | A body that isn't JSON, or isn't the shape the adapter's schema describes | No |

`malformed` is not retried on purpose. A provider that changed its response will send the changed response again; eight retries only delay the news, and storing a guess is worse. The job is dead-lettered with the parse error in it.

The job queue is where these are acted on (`market-data.worker.ts`): a retryable failure waits with exponential backoff and jitter, starting at 30 seconds and capped at 30 minutes, for eight attempts (about an hour); anything else, and a job out of attempts, is copied to a dead-letter queue with its payload and error, from where `jobs retry-dead` puts it back. A retry is always safe because the writes are idempotent: bars are upserted on `(symbol, session)`, and a range's corporate actions are replaced.

### 4. One provider at a time

The source is chosen by configuration (`provider.env.ts`): Alpaca when its keys are set, Yahoo only when `MARKET_DATA_PROVIDER=yahoo` says so. There is **no automatic failover** from one to the other.

Failing over would put two sources into one series. Their closes agree; their volumes don't (Yahoo's are rounded), their finer prices don't (section 2), and Yahoo's values are restored from adjusted ones while Alpaca's were never adjusted. A series that switched source on the nights Alpaca was down would differ from itself for reasons no one could reconstruct, and Phase 4's exit asks that replaying an archived payload reproduce the stored bars exactly. When Alpaca is down the jobs wait and retry; a daily bar that arrives an hour late costs nothing.

### 5. The contract tests

`provider.contract.spec.ts` runs one suite against every adapter. Each adapter replays its own recorded HTTP exchanges (`fixtures/<provider>.json`) of one scenario: Apple from 2020-08-03 to 2020-09-04, which holds a 4-for-1 split and a dividend that went ex before it, and a ticker no exchange lists. The assertions are facts, not shapes: 25 sessions, a close of 499.23 on the Friday before the split and 129.04 on the Monday, a dividend of 0.82, a split of 1 to 4, nothing for the unknown ticker, and the four failure kinds for a 429, a 502, a 403, and a body in another shape. An adapter that forgot to undo an adjustment fails on the first of them.

A fixture is whole exchanges, URL and body text, so the test covers the request the adapter builds and the parsing of numbers out of the text. `pnpm --filter @astraq/api fixtures:record --provider <name>` records one from the live endpoint.

## Consequences

- Ingestion, the jobs, and the first-watch load call one interface. Adding a provider is an adapter, a fixture, and one line in the suite's list.
- Yahoo-sourced bars are to the cent, with rounded volume and no pay dates. Good for a keyless local database; the deployed app stays on Alpaca.
- Yahoo's endpoint is undocumented. When it changes, the adapter's schema rejects the response as `malformed` and nothing is stored; the fix is in one file.
- A Yahoo backfill is two requests per ticker and a refresh is a job per ticker. Fine for tens of symbols, slow for thousands.
- The Alpaca fixture is built by hand in the documented response shapes, from the same sessions' raw values: there were no Alpaca keys on the machine that wrote it. Until it is recorded, the suite proves the Alpaca adapter against the documentation, not against the service.
- A switch of provider on an existing database rewrites only the bars it reloads. Mixing is prevented by not failing over, not by the schema: nothing records which provider a bar came from. The raw payload archive (Phase 4 item 7) is where that will be kept.
