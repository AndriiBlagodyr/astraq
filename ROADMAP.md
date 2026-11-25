# Veracand Roadmap

## Status (2026-11-25)

> **Rule for this block:** it describes what runs, not what is planned. Update it in the same PR that changes reality.

**Where each phase stands**

| Phase | State | What's left to exit |
|---|---|---|
| Design system v2 | done | — |
| 0 — Foundation | done but one setting | make CI a required check on `master` (GitHub setting) |
| 1 — Walking skeleton | code-complete | create the Railway and Vercel projects, first deploy, phone check ([docs/deploy.md](docs/deploy.md), ADR 0005) |
| 2 — Accounts, watchlists, first D3 view | code-complete | the end-to-end auth check and the product check, both on the deployed app; the row-to-header morph waits for Phase 6 |
| 3 — Paper trading | items 1 to 7 done: the api, the portfolio pages with the equity curve, the order ticket, tracing, the portfolio on Today and the stock page, and the ticket in the command palette with orders sized in shares or dollars | item 8 (backups, which needs the deployed database), the trace of an order seen on the deployed app, and the product check |
| 4 — Market data pipeline | items 1 to 6 done: the provider contract with Alpaca and Yahoo adapters and its contract tests, the BullMQ jobs with retries, backoff, and a dead-letter queue, the refresh scheduled after each close from the exchange calendar, the data quality checks on `/status`, compression of the daily bars with weekly bars as a continuous aggregate, and a Redis cache in front of the latest closes and the symbol search | items 7 and 8: the raw payload archive, a queue dashboard; ADR 0011; two weeks of the deployed worker keeping symbols fresh, and the product check |

**Next, in order**

1. **Deploy** (only you can: the accounts are yours). Three phases now wait on it, and every product check needs a real URL. It is four services now: [docs/deploy.md](docs/deploy.md) gained Redis and the worker, and two api variables it didn't list (`REDIS_URL`, `JWT_SECRET`).
2. **Phase 3 item 8:** nightly Postgres backups on the host. It comes after the deploy: there is no host to back up yet.
3. Try the order ticket in a browser: open it, watch the preview and a refusal, place an order, cancel one. Then open it from the palette (⌘K, "New paper order", or "Trade NVDA" on a stock page) and size an order in dollars. It was built and its pages checked against a running api, but the drawer itself was not clicked through.
4. Look at the equity chart on a portfolio's Holdings tab in a browser, in a light and a dark theme: its numbers were checked in the served page, its canvas was not seen.
5. Open a stock you have traded in a browser: the fill markers (B under a bar, S over it) are drawn on the chart's canvas, which was not seen; the position summary, the note under the chart, and Today's portfolio card and market status were read in the served pages.
6. Place an order with `pnpm infra:up` and `pnpm dev` running and open its trace at <http://localhost:16686> (service `veracand-web`, operation `order.submit`).
7. Run `calendar:sync` once with Alpaca keys and compare a known holiday and half day: the calendar loader is tested against the documented response, not yet against the live endpoint. The missing-sessions check needs it too: it compares bars against the stored calendar.
8. Try the keyboard reorder in a browser: the one [audit follow-up](#audit-follow-ups) that needs eyes.
9. Record the Alpaca fixture with keys: `pnpm --filter @astraq/api fixtures:record --provider alpaca`, then `pnpm --filter @astraq/api test:unit`. The one in the repo was built by hand from the documented response shapes, so the contract suite hasn't met Alpaca's real answers yet.
10. Run the worker with Alpaca keys over one close (`pnpm --filter @astraq/api worker`) and read `/status` the next morning. The schedule, the refresh, and the checks ran end to end here on Yahoo; with Alpaca the request half an hour after the close is the untried part (the client stops its range 16 minutes ago, for the free plan's delay on recent data).
11. Open a stock in a browser and switch Bars to Weekly, on raw prices too: the weekly bars were compared with the daily ones through the api (below), the chart with them on it was not seen.
12. **Phase 4 item 7:** MongoDB and the raw payload archive, with ADR 0011.

**Working today**

- **Foundation.** `pnpm dev` starts web, api, ml, and the UI package watcher; `pnpm infra:up` runs Postgres 16 + TimescaleDB, Redis 7, and Jaeger; `pnpm db:migrate` applies the Prisma migrations. Every service validates its env at boot. GitHub Actions runs lint, typecheck, and unit tests for every Node package, the token drift check, the contract drift check (`pnpm contract` must leave `openapi.json` and the SDK unchanged), the api's integration tests against TimescaleDB and Redis containers, and ruff, mypy, and pytest for `services/ml`. Renovate opens grouped dependency PRs weekly.
- **Contracts.** Requests and responses are validated against Zod schemas from `packages/shared`; a committed `openapi.json`, Swagger UI at `/api/docs` outside production, and the typed `packages/sdk` client generated from the spec.
- **UI kit.** `@astraq/ui` 0.2.0: Base UI components, generated tokens, 6 themes × light/dark, density, built ESM, Storybook with docs pages.
- **Market data.** `symbols`, `corporate_actions`, and the `candles_daily` hypertable. `symbols:sync` loads the active US equity list; `bootstrap` fills daily bars and corporate actions from Alpaca for ~20 tickers (a rerun replaces corrected actions and fills dividend pay dates); watching a symbol or placing an order for it loads its history on demand. Bars and corporate actions come through one provider contract ([ADR 0010](docs/decisions/0010-provider-contract-and-failure-modes.md)) with two adapters: Alpaca, and Yahoo for a machine without keys (`MARKET_DATA_PROVIDER=yahoo`), which restores raw prices from Yahoo's split-adjusted floats. `GET /api/symbols` (best match first) and `GET /api/symbols/:ticker/candles` serve them, split- and dividend-adjusted in SQL by an exact `numeric_product` aggregate; `?interval=1w` serves weekly bars under the same adjustments. `GET /api/symbols/:ticker/returns` computes daily returns and their summary stats in SQL.
- **Accounts** ([ADR 0006](docs/decisions/0006-refresh-token-rotation-and-reuse-detection.md)). Invite-only registration (`INVITE_EMAILS`), Argon2id login, rotating refresh tokens with family reuse detection, logout and "log out everywhere", Redis-backed rate limits counted per browser. `/api/me` serves the profile and the signed-in devices.
- **Watchlists.** `/api/watchlists/*` creates, renames, deletes, and reorders lists and their symbols, every query scoped by the owner's id; rows carry last close, day change, and a 30-session sparkline, and the index names each list's best and worst movers.
- **Paper trading** ([ADR 0008](docs/decisions/0008-fill-model-shared-by-paper-trading-and-backtesting.md), [ADR 0009](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md)). `/api/portfolios/*` creates paper portfolios with starting cash and trading costs, moves cash in and out, and places (once per `Idempotency-Key`), lists, and cancels orders. Orders fill by the shared fill model (`apps/api/src/trading/fill-model.ts`, specified by `packages/shared/fixtures/fill-model.json`). Every fill, cash move, split, and dividend is a transaction in a double-entry ledger that derives cash, FIFO lots, realized PnL, and dividends by replay, on a hand-built exact decimal. A portfolio is settled whenever it is read or written, before anything is added to it (`apps/api/src/trading/settlement.ts`). `GET /api/portfolios/{id}` prices each position at its latest stored close: market value, unrealized PnL, and the portfolio's equity (`apps/api/src/trading/valuation.ts`). An order is checked when it is placed (`apps/api/src/trading/risk.ts`, ADR 0009 section 9): one the portfolio can't cover at the latest close or its limit, net of open orders, or one over the portfolio's largest order, is a 422 and isn't stored. `POST .../orders/preview` answers the same check without placing anything: when the order would fill, the estimated cost, the cash after, and the refusal if any. An order is sized in shares (`quantity`) or in dollars (`amount`): the api turns an amount into shares when the order is placed, at the price it estimates the order at, rounded down to a millionth of a share, and keeps the amount on the order (`sharesFor` in `risk.ts`). `GET .../activity` is the ledger as a timeline, one line per transaction with what it did to cash and the cash after it (`apps/api/src/ledger/activity.ts`), and each position lists its open FIFO lots. `GET .../equity` is the equity curve: the ledger replayed a day at a time and priced at each day's closes, with the day's gain or loss beside it (`apps/api/src/trading/equity-curve.ts`); the last point is the equity `GET /api/portfolios/{id}` reports, and its gain or loss is the day PnL.
- **Exchange calendar.** `market_sessions` holds each trading day's open and close, from Alpaca's calendar (`calendar:sync`; with Alpaca keys the api also reloads the year ahead when the table runs short). Where it is loaded, a market order placed on a holiday or after a half day's early close waits for the next session instead of filling at the last close. Where it isn't, the clock falls back to weekdays, 09:30 to 16:00. `GET /api/market/status` answers from the same clock: open or closed, the session trading now, the next one to open, and whether the answer came from the calendar or the weekday fallback (`marketStatus` in `apps/api/src/trading/market-hours.ts`).
- **Web.** One app shell with the ⌘K command palette, keyboard shortcuts, the theme menu, the user menu, and a route crossfade. Today (market status with the next session, a card per paper portfolio with equity, day PnL, cash, and open orders, a card per watchlist, recently viewed stocks), `/stocks` and `/stocks/[symbol]` (a `lightweight-charts` candle + volume chart with range presets, a custom range, daily or weekly bars, split-adjusted / raw prices, split markers, and markers on the sessions your orders filled in; above it, what you hold of the symbol in each portfolio: shares, average cost, market value, unrealized PnL), `/watchlists` and `/watchlists/[id]` (server actions, undo, drag or keyboard reorder), `/portfolios` (each portfolio's equity, cash, day PnL, and total return; create one with its cash, costs, and largest order) and `/portfolios/[id]` (equity and where it comes from, day PnL, the equity curve over the cash paid in, positions at their latest close with weights and their lots, paper cash in and out), `/portfolios/[id]/orders` (every order with its status and fill, cancel on the open ones), `/portfolios/[id]/activity` (the ledger as a timeline with running cash), the order ticket (a drawer on the portfolio pages, holdings rows, the stock page, and from the palette on any page: it takes shares or a dollar amount, and previews the fill, the cost, and any refusal before placing), `/analysis/returns` (a hand-built D3 histogram beside a stats table), `/settings` and `/settings/sessions`, `/status` (live api and ml health with each build's commit, and the last data quality check of the stored bars: a row per check with what it found), and register / login / logout through BFF routes that keep the tokens in `HttpOnly` cookies. `proxy.ts` does the session check with silent refresh, CSP, and the security headers.
- **Tracing.** OpenTelemetry in the api (`apps/api/src/tracing.ts`) and the web server (`apps/web/lib/tracing.ts`), each wired by hand from the SDK's parts. One trace runs from the browser's request through the page or server action, the call to the api (`traceparent`), and the api's handler to every SQL statement. Placing an order adds two named spans, `order.submit` in the web and `order.place` in the api, with the order's symbol, side, and outcome. In development both send to the Jaeger that `pnpm infra:up` starts (<http://localhost:16686>); anywhere else tracing is off until `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
- **Jobs.** A BullMQ queue on Redis with three market data jobs: `symbol-backfill` (one symbol's history), `eod-refresh` (the bars of the symbols that have any, a job per provider batch, each reaching back past its stalest symbol's last bar so a missed week fills itself), and `corporate-actions-refresh`. `pnpm --filter @astraq/api worker` works the queue in its own process; `pnpm --filter @astraq/api jobs <backfill|eod-refresh|actions-refresh|status|dead|retry-dead>` enqueues and inspects. A failure that can pass is retried for about an hour with exponential backoff and jitter; one that can't, or a job out of attempts, goes to a dead-letter queue with its payload and error. **The schedule** is on the queue too: each trading day has one delayed `session-close` job, due half an hour after that day's close by the exchange calendar (13:30 New York on a half day, none on a holiday). It schedules the next session's job, then enqueues the day's bars and corporate actions with a `data-quality-check` that runs when those are over. A worker that starts after missing a close runs that session at once, and the refresh fills every day missed. Every job is safe to run twice: bars are upserted and a range's corporate actions replaced.
- **Storage policies.** Two jobs run inside the database, on TimescaleDB's own scheduler. Once a day, chunks of `candles_daily` that are wholly older than 90 days are compressed, by symbol and ordered by time; a backfill or a corrected bar still upserts into them. `candles_weekly` is a continuous aggregate of the raw daily bars, refreshed by ingestion over the weeks it wrote and hourly as a safety net, with the current week computed on read. The weekly endpoint scales a week from the aggregate when one adjustment factor covers it and rebuilds it from daily bars when a split or dividend goes ex inside it.
- **Cache.** The latest close per symbol (an hour) and each symbol search (ten minutes) are read through Redis, by hand on the api's client: `MGET`, a pipeline of `SET ... EX`, and a miss whenever Redis fails. Ingestion deletes the closes of the symbols it wrote and moves the searches to a new generation, so neither normally waits for its TTL. Trading never reads it.
- **Data quality.** After each session's refresh the worker checks the bars of the active symbols: sessions the exchange held that a series has no bar for, bars stored twice or copied from the session before, bars whose low, high, open, and close can't be one day's trading, and symbols whose bars stop before the session just closed. Each run is a row in `data_quality_runs` with a count per check and a sample of what was found; `GET /api/market/data-quality` serves the latest and says when it is older than the session due.
- **ML.** `services/ml` is a `uv`-managed FastAPI stub with validated settings; it does nothing yet (Phase 5).

**Not yet real**

- Deployment (prepared, not live) and CI as a required check on `master`.
- An order asked for in dollars is sized at the latest close (or its limit) when it is placed, not at its fill: one that waits for the next open spends a little more or less than the amount, and can be refused there if the price rose past the cash.
- Today's market status is true when the page loads and doesn't tick. Today and the stock page read each portfolio's books and its whole order list per request (no endpoint serves one symbol's fills), which is fine for a handful of paper portfolios and not beyond.
- The Activity and equity endpoints return the whole history: no paging or date range until a portfolio is old enough to need one.
- The equity curve has a point for each day a symbol the ledger names closed, or a transaction was booked. A portfolio that is all cash gets no point on a day nothing happened, and a day's point can fall on a weekend when cash was moved then.
- Traces outside a developer's machine: no collector is chosen for the deployed app, so production traces go nowhere yet (Phase 10 picks the backend with metrics and dashboards). Backups (Phase 3 item 8) wait for the deployed database.
- The exchange calendar on the live Alpaca endpoint: the loader hasn't run against it yet. A database where it never ran still knows weekends only.
- The worker anywhere but a developer's terminal: it isn't part of `pnpm dev` (it exits without a provider, which a keyless checkout doesn't have) and it isn't deployed, so nothing refreshes by itself yet. Its Railway service is prepared (`apps/api/railway.worker.json`). Portfolios settle when read; a bar or corporate action loaded late is applied late.
- The refresh on Alpaca: scheduling, the catch-up after a missed close, and the checks ran end to end on Yahoo only. The first request for a day's bar half an hour after its close hasn't met Alpaca.
- The data quality checks only report. Nothing reloads a missing session or a bad bar by itself; a stale symbol is retried by the next refresh. Missing sessions are checked only as far back as the calendar is stored, and not at all where it isn't (the check says "Not checked"). Without the calendar a holiday has a refresh that finds nothing, and every symbol reads as stale until the next session.
- `/status` doesn't show the queue: jobs waiting, failed, or dead-lettered are in the `jobs` CLI only (Phase 4 item 8).
- The Alpaca side of the provider contract tests runs against a fixture built by hand, not a recording. The worker's shutdown (finish the job in flight, then exit) was not exercised: the local check stopped it with a kill.
- No retention policy: every chunk of daily bars is the only copy of that history. Retention comes with the 1-minute bars (Phase 9 item 2).
- Bars written around ingestion (psql, a test) aren't in the weekly bars until the hourly refresh, and don't invalidate the cache. Deleting a symbol leaves its weeks in the aggregate until then too.
- The cache shares the queue's Redis, which must not evict (`noeviction`): the TTLs are all that bounds it. Nothing shows its hit rate outside a trace (`cache.latest-closes`, `cache.symbol-search` spans). A close loaded just before a write and stored just after it stays for up to an hour.
- The storage policies ran on a local database with two symbols (12 of 13 chunks compressed, a ten-year backfill upserted into them). Their sizes and timings on a real universe are unknown; `timescaledb_information.job_stats` is where to look.

**Carried gaps**

- **Phase 3 → 4:** Phase 4 started on 2026-11-24 before Phase 3 exited: backups (item 8), the trace on the deployed app, and the product check all need the deployed app.
- **Phase 2 → 3:** Phase 3 started on 2026-11-12 before Phase 2 exited: its end-to-end auth check and product check need the deployed app.
- **Phase 1 → 2:** Phase 2 started on 2026-10-21 before Phase 1 exited: the first deploy, CI as a required check, and the phone check are still open.
- **Smaller, from Phase 1:** the chart's OHLCV readout follows the mouse, with no keyboard way to inspect a bar (Phase 6 chart work); a split and a dividend on the same ex-date make the `all` adjustment slightly wrong (rare; the Phase 4 data quality checks look at stored bars, not at adjustment, so this is still open).

Rewritten roadmap, see [Revision log](#revision-log).

Veracand has two jobs at once:

1. Turn a frontend-heavy background into real fullstack depth — Node.js, Python, SQL, data modeling, infrastructure.
2. Become a personal market-research tool you actually use — not a sandbox of disconnected experiments.

The plan optimizes for both by shipping **one thin, deployed, end-to-end slice first** and then thickening it. Every later phase adds depth to something that already runs in production.

---

## Product North Star

**The core loop:** watchlist → chart → strategy → honest backtest → paper trade → review.

The first meaningful release lets you:

- sign in securely
- search US equities and keep watchlists
- read adjusted historical candles with indicators
- define simple rule-based strategies
- backtest them with bias guards you can trust
- paper trade the same rules and see accurate portfolio PnL

**The wedge** — what makes Veracand worth opening instead of TradingView: *honesty*. Backtests and paper trading share one fill model, results always show a buy-and-hold benchmark, and look-ahead or survivorship shortcuts are impossible by construction rather than by discipline. That is also where the deepest engineering learning lives.

If a task doesn't move the core loop forward or clearly deepen a core engineering skill, question it.

---

## Scope decisions

These are locked unless an ADR reverses them.

| Decision | Choice | Why |
|---|---|---|
| Asset class for v1 | **US equities, daily bars** | Matches current UI, teaches market calendars and corporate actions. Crypto arrives later as a second adapter. |
| Primary data provider | **Alpaca Market Data** (free plan) | Official API with keys, split/dividend-adjusted bars, asset list, market calendar, websocket feed for Phase 9. |
| Fallback provider | Yahoo Finance's chart endpoint, by a hand-written client | Keyless, good for quick local bootstrap. Unofficial and brittle: never the only path, and never mixed into a series by failover (ADR 0010). Not `yahoo-finance2`: it returns prices as floats. |
| Bar resolution | Daily until Phase 9 | Keeps storage, jobs, and fill logic simple while the domain model settles. |
| Price adjustment | Store raw bars + corporate actions; derive adjusted series | Needed for correct PnL on splits *and* correct backtests. |
| Money | `numeric` in Postgres, `Decimal` in TS/Python, never floats | Portfolio math must reconcile to the cent. |
| Time | `timestamptz` UTC everywhere; exchange-local only at the edges | Avoids DST and session-boundary bugs. |
| Deployment | From Phase 1, not the end | Product checks like "from my phone" need a real URL. Observability needs real traffic. |

---

## Stack

`AGENTS.md` holds repo-wide guardrails; this table is the authoritative stack and when each piece enters.

| Layer | Choice | Enters | Notes |
|---|---|---|---|
| Web | Next.js 16 App Router, RSC-first; server actions for writes. TanStack Query joins when something needs a client-side cache (Phase 9 live data) | now | Web is a BFF: holds tokens in `HttpOnly` cookies, never a second auth system. |
| UI | `packages/ui` (Tailwind + semantic tokens + headless primitives) | now | Trading patterns stay in `apps/web`. |
| Charts | `lightweight-charts` for OHLCV, `d3` only for bespoke visuals | Phase 1 / Phase 2 | First `d3` view (returns distribution) in Phase 2; the rest in Phase 6. |
| API | NestJS 11, `nestjs-zod`, `@nestjs/swagger` | now | Layering `controller → service → repository`. |
| Contracts | `packages/shared` (Zod) → OpenAPI → `packages/sdk` via `openapi-typescript` + `openapi-fetch` | Phase 1 | Small, readable generated client — no heavyweight codegen. |
| Cross-language contracts | Zod → JSON Schema (`z.toJSONSchema`) → Pydantic (`datamodel-code-generator`) | Phase 5 | One source of truth for the strategy DSL. CI fails on drift. |
| Relational + time series | Postgres 16 + TimescaleDB | Phase 0 infra, Phase 1 schema | |
| ORM / SQL | **Prisma is the only database toolkit on the Node side**: Prisma Client for models, Prisma Migrate for every schema change, TypedSQL (`$queryRaw` as fallback) for hand-written candle and analytics queries, `prisma db seed` for fixtures. No second ORM, query builder, or migration tool (no Drizzle, Kysely, TypeORM, Knex, node-pg-migrate) | Phase 1 | Learning goal: be fluent in real SQL, not just the ORM. TimescaleDB DDL (extension, hypertables, later compression and continuous aggregates) lives in Prisma migrations made with `migrate dev --create-only` and edited by hand. Prisma is Node-only: `services/ml` reads Postgres with a plain SQL driver against the schema Prisma owns, and never migrates it. |
| Cache, limits, queues | Redis 7 + BullMQ | Phase 2 (rate limits), Phase 4 (jobs) | |
| Node ↔ Python jobs | BullMQ on both sides (`bullmq` Python package for workers) | Phase 5 | One queue technology instead of BullMQ + Celery. |
| Documents | MongoDB 7 via Prisma's MongoDB connector (separate Prisma schema and client), not Mongoose | Phase 4 | Raw provider payload archive, later news and research notes. Explicit learning goal; ADR compares against `JSONB`. Check that the Prisma major in use supports MongoDB before Phase 4 starts. Prisma has no MongoDB migrations, so TTL and other indexes are created in a small idempotent script. |
| Python service | FastAPI, `uv`, polars, ruff, mypy (strict), pytest + hypothesis | now | Owns backtesting, analytics, and ML. Never owns transactional flows. |
| Streaming | Redis Streams → SSE to the browser | Phase 9 | NATS/Kafka dropped from scope. |
| Observability | Pino now → OpenTelemetry tracing in Phase 3 → metrics/dashboards in Phase 10 | | |
| CI/CD | GitHub Actions + Turborepo cache + `uv` cache, Renovate | Phase 0 | |
| Hosting | Vercel (web), Railway or Fly.io (api, ml workers), Postgres **with TimescaleDB support** | Phase 1 | Many managed Postgres products lack Timescale — verify before choosing. Timescale's own cloud or the official image on a volume both work. |
| Secrets | Platform env vars in Phase 1 → Doppler or SOPS once there's more than one environment | Phase 10 | |

**Dropped or deferred:** NATS (Redis Streams covers the scope), Celery/arq (replaced by BullMQ Python workers), Kubernetes (stretch), GraphQL/gRPC (stretch comparisons), MLflow (only if model work justifies it), a second backtest engine in TypeScript (never).

### Service boundaries

```text
browser ──► apps/web (BFF, RSC) ──SDK──► apps/api ──► Postgres/Timescale  (api is the only writer of domain tables)
                                            │   └──► Redis (cache, rate limits)
                                            │   └──► MongoDB (raw payloads, news, notes)
                                            └──BullMQ──► services/ml workers
                                                            └──► Postgres (read-only role on market data)
                                                            └──► job result returned to api, api persists it
```

- `services/ml` never writes domain tables. It reads market data through a read-only role and returns results through the job.
- Every cross-service shape lives in `packages/shared` or the generated OpenAPI — never duplicated by hand.

```text
astraq/
├── apps/
│   ├── web/      Next.js 16 frontend (BFF)
│   └── api/      NestJS domain API
├── services/
│   ├── ml/       FastAPI + BullMQ workers: backtests, analytics, forecasting
│   └── ingest/   streaming ingestor (Phase 9)
├── packages/
│   ├── ui/       tokens + accessible core components
│   ├── shared/   Zod schemas, exported JSON Schema
│   └── sdk/      generated OpenAPI client
├── infra/
│   └── docker/   local compose
└── docs/
    └── decisions/  ADRs
```

---

## Working rules

### Delivery

- **Walking skeleton first.** Each phase extends something already deployed. No phase ends with work that only runs locally.
- **Time boxes.** Each phase has an estimate (assuming ~10–12 hours/week). Passing 1.5× the estimate triggers the phase's kill/pivot rule — descope, don't grind.
- **Exit green or change the rule.** Don't start a phase until the previous one exits. If you deliberately carry a gap forward, record it under "Carried gaps" in the status block — never silently.
- **No placeholder routes.** A route exists only when it renders real data. Future ideas live in this file, not in the UI.
- **One implementation path.** Alternatives become ADRs, not parallel code.
- **User-facing features ship complete:** schema → service → repository → tests → OpenAPI → SDK → web → deployed.

### Definition of done (every phase)

1. Code merged to `master`, CI green, deployed.
2. Tests at the right level (see [testing strategy](./.cursor/rules/testing-strategy.mdc)).
3. At least one ADR in `docs/decisions/`.
4. Status block at the top of this file updated.
5. **Product check** passed — a concrete usage outcome, not a feature list.

### Cross-cutting

- **Security.** Follow [security and secrets](./.cursor/rules/security-and-secrets.mdc). Env validated at boot in every service; fail-closed CORS, auth, and permissions.
- **Learning over shipping** — when a library exists *and* there's a teaching opportunity, build one layer by hand first (refresh-token rotation, ledger accounting, event-driven backtester). Write down what you'd replace it with in production.
- **Data licensing.** Provider data is for personal use. No public pages that redistribute raw vendor data; a friend's account (Phase 10) is still private use.
- **Pages and navigation.** Every route, menu item, and the home page's contents per phase are in [docs/ui-plan.md](docs/ui-plan.md). A phase's web work builds the pages listed there for it.
- **Motion.** UI motion follows [docs/motion-and-delight-plan.md](docs/motion-and-delight-plan.md). Each phase ships the motion items listed for it there; none are built on placeholder routes.
- **Finance correctness is a first-class concern**, not a detail: adjusted prices, trading calendars, point-in-time data, decimal money.

---

## Completed

### Design system foundation (formerly Phase 1.5) — done

`packages/ui` with semantic tokens, independent theme identity and light/dark mode, headless primitives, Storybook, and tests. Mantine removed. ADR 0001.

### Design system v2 — done

Base UI primitives, a generated token pipeline, 6 themes, density, and an extractable `@astraq/ui` (`0.2.0`, see `packages/ui/CHANGELOG.md`). [ADR 0002](docs/decisions/0002-design-system-base-ui-and-token-architecture.md); tracked in [docs/design-system-plan.md](docs/design-system-plan.md) as 7 PRs.

- PR 1 (restructure, interaction states) — done
- PR 2 (hand-built token pipeline, full per-theme palettes, contrast matrix) — done
- PR 3 (Base UI migration) — done
- PR 4 (6 themes + density) — done
- PR 5a (form components, hand-built SegmentedControl) — done
- PR 5b (overlays and feedback: Popover, Menu, ContextMenu, AlertDialog, Drawer, Toast, PreviewCard, Progress, Meter, Skeleton, Spinner sizes) — done
- PR 5c, 5d, 6 (display, data, distribution) — done
- PR 7 (Storybook docs pages, raw-color lint rule, alias cleanup) — done
- Follow-up: the app's CSS modules read `--ds-*` tokens directly, and the transitional aliases are deleted — done

Follow-ups folded into Phase 0: migrate the surviving routes from `layout.module.css` to `packages/ui` compositions — done (only `VeracandLogo.module.css` remains: SVG keyframes and per-mode logo colors). The CI job also runs the token drift check (item 5) — done.

---

## Phase 0 — Close the foundation · ~1 week

**Goal:** make the repo honest, reproducible, and verified by CI before anything else is built on it.

1. **Hygiene:** untrack `apps/api/tsconfig.build.tsbuildinfo`, `apps/web/test-results/`, and `services/ml/*.egg-info/`; ignore `*.tsbuildinfo`. Align `requires-python` with the pinned 3.12 — done.
2. **Delete placeholder routes** in `apps/web`. Keep the home page, auth screens, `/status`, and one app shell. Routes come back in the phase that fills them. The full list, the home page rewrite, and the brand rules are in [docs/ui-plan.md § Phase 0 cleanup](docs/ui-plan.md#phase-0-cleanup) — done.
3. **Local infra** in `infra/docker/compose.yml`: Postgres 16 + TimescaleDB, Redis 7. (Mongo and Mailhog join in the phases that use them.) Root scripts `pnpm infra:up` / `infra:down` — done.
4. **Env validation everywhere:** `pydantic-settings` in `services/ml`; add `CORS_ORIGINS`, `DATABASE_URL`, `REDIS_URL` to the API schema. Replace `app.enableCors()` with an allowlist — done.
5. **CI** (GitHub Actions): install, lint, typecheck, unit tests for all Node packages and `services/ml`, with Turborepo and `uv` caching. Add ruff + mypy to the ML job now — cheap while the codebase is tiny. Run `pnpm --filter @astraq/ui tokens:check`, so stale generated token files fail CI — done.
6. **Renovate** with grouped, weekly updates — done.
7. Echo `x-request-id` back in API responses — done.

**Learning focus:** reproducible environments, CI pipelines, container basics.

**Exit criteria:**

- fresh clone → `pnpm install && pnpm infra:up && pnpm dev` boots everything with no manual steps — done 2026-10-04 (web, api with migrations applied to an empty database, and ml all healthy on `/status`)
- CI is green and required on `master`
- every service crashes on invalid env
- ADR 0003: "pnpm + Turborepo, and how Python lives in the monorepo" — [done](docs/decisions/0003-pnpm-turborepo-and-python-in-the-monorepo.md)

**Kill/pivot trigger:** if CI or compose polish runs past a week, ship whatever runs and list the gaps under "Carried gaps".

---

## Phase 1 — Walking skeleton: candles end to end · ~2–3 weeks

**Goal:** one real feature from provider to deployed chart, proving every layer and contract at once.

1. **Contracts:** create `packages/shared` (Zod) and wire `nestjs-zod` + `@nestjs/swagger`. `pnpm contract` writes `apps/api/openapi.json` and regenerates `packages/sdk` (`openapi-typescript` + `openapi-fetch`); both are committed. CI fails if the committed spec or SDK drifts from the code — done ([ADR 0004](docs/decisions/0004-nestjs-openapi-generated-sdk-contract.md)).
2. **Schema (Prisma schema + Prisma Migrate; the hypertable SQL is a hand-edited `--create-only` migration):**
   - `Symbol` (ticker, name, exchange, active flag)
   - `candles_daily` hypertable: `(symbol_id, ts)` primary key, raw OHLCV, `numeric` prices
   - `corporate_actions` (split ratio / dividend, ex-date)

   Done: one `init` migration. Prisma's diff ignores the extension, the hypertable, and the CHECK constraint, so `migrate dev` reports no drift. Timescale's default `ts` index is skipped (`create_default_indexes => false`); Prisma would otherwise try to drop it.
3. **Bootstrap CLI** (`apps/api` script): fetch daily raw bars + corporate actions for a fixed list of ~20 tickers from Alpaca and upsert them. Idempotent, synchronous, no queues. Done: `pnpm --filter @astraq/api bootstrap [--tickers NVDA,AAPL]`. The Yahoo fallback was dropped: a second provider is multi-provider logic, which the kill trigger below puts in Phase 4.
4. **Endpoints:** `GET /api/symbols?query=`, `GET /api/symbols/:ticker/candles?from&to&adjustment=raw|split|all` (default `split`; `all` adds dividends for a total-return series). Adjustment is computed in SQL from raw bars + corporate actions — the first hand-written query worth being proud of. Done: a window-function running product over a hand-written exact `numeric_product` aggregate (migration `numeric_product`), no floats.
5. **Web:** `/stocks/[symbol]` renders a real `lightweight-charts` candle + volume pane from the SDK, with loading, empty, and error states. Symbol search on `/stocks`. Done: range presets (1M–Max), a custom range (`?from=&to=`, picked with `DateRangePicker`), and split-adjusted / raw prices live in the URL and render on the server; only the chart is a client component, and it repaints on theme or mode changes. Last close and day change: `GET /api/symbols` returns each symbol's latest close and the previous one, split-adjusted to the latest session's shares in SQL, and both `/stocks` results and the Today table show them. Split days are marked on raw charts: the candle response lists the splits in the range, and a line under the chart names them for screen readers. The header's price and day change come from the latest stored session, whatever the chart shows. A top-bar search lands on `/stocks`, which opens an exact ticker (or a single match) directly; the API ranks ticker matches before name matches. Page changes crossfade (`RouteTransition`, `experimental.viewTransition`); Today and Status have a `Skeleton` loading state. The chart draws in left to right on first load (the `--ds-motion-slow` token with an ease-out quint), holding its axes at the full range's bounds; it's instant under reduced motion.
6. **Deploy:** web on Vercel, api on Railway/Fly, Postgres with Timescale support. Preview deploys for web PRs. `/health/ready` really checks the database (done). Prepared ([ADR 0005](docs/decisions/0005-hosting-topology-and-timescale-availability.md), [docs/deploy.md](docs/deploy.md)): Vercel for web, Railway for the api (a multi-stage `apps/api/Dockerfile`, with migrations in the pre-deploy step) and for Postgres (the same Timescale image as compose and CI, on a private volume). Ready since: `/health` and `/status` report each build's commit (Railway's and Vercel's commit variables), every page is behind sign-in (Phase 2 sessions replaced the Phase 1 `SITE_PASSWORD` gate, resolving the public-data question in [docs/ui-plan.md](docs/ui-plan.md#decisions)), and Today renders per request instead of being prerendered at build time. Not yet: creating the projects and the first deploy.
7. Remove the `/predictions/summary` and ML `/predict` stubs — dead placeholders teach nothing. Done: both are deleted.

**Learning focus:** OpenAPI and typed clients, migrations, hypertables, composite keys, SQL window functions, RSC vs client boundaries for charts, first deployment.

**Exit criteria:**

- a deployed URL shows adjusted candles for any bootstrapped ticker
- an integration test runs the candle endpoint against real Timescale in CI (Testcontainers or a compose service) — done: `candles.repository.int-spec.ts` in the `api-integration` CI job, with a TimescaleDB service container
- a unit test proves split adjustment with a known split (e.g. NVDA 2024 10:1) — done in the same suite, since the adjustment lives in SQL
- ADR 0004: "NestJS + OpenAPI-generated SDK as the web ↔ api contract" — [done](docs/decisions/0004-nestjs-openapi-generated-sdk-contract.md)
- ADR 0005: "Hosting topology and Timescale availability" — [done](docs/decisions/0005-hosting-topology-and-timescale-availability.md)
- **product check:** I opened a candle chart on my phone from the deployed URL

**Kill/pivot trigger:** if the bootstrap starts growing retries, caching, or multi-provider logic, stop — that's Phase 4. If NestJS DI is blocking progress after two weeks, fall back to Fastify with a hand-rolled module pattern and record why.

---

## Phase 2 — Accounts, watchlists, and the first D3 view · ~3–4 weeks

**Goal:** real authentication, built once, protecting the first personal data.

No temporary auth shim: the skeleton already shows value without login, so there's nothing to migrate later. Build the auth core properly now and defer the peripheral flows to Phase 7.

1. **Auth core, hand-built:**
   - registration + login with **Argon2id**
   - short-lived JWT access token + **rotating opaque refresh token with family-based reuse detection**
   - logout and "log out everywhere"
   - web BFF stores tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies and refreshes transparently
2. **Registration is invite-only** (env allowlist of emails) while the app is deployed without email verification.
3. **Abuse protection:** Redis-backed rate limiting on auth endpoints, CSP and security headers in the Next proxy (`apps/web/proxy.ts`).
4. **Schema:** `User`, `Session`, `RefreshToken`, `Watchlist`, `WatchlistItem`, `AuditLog`. Done: migrations `auth` and `watchlists`.
5. **Watchlists:** create, rename, reorder, add/remove symbols. Done: the api (`/api/watchlists`, ownership tested against the database) and the pages. `/watchlists` lists each list with its symbol count and creates, renames, and deletes (undo from the toast); `/watchlists/[id]` shows a row per symbol with last close, day change, and a sparkline from stored candles, adds symbols by ticker or name search, removes them (undo), and reorders them with the row's grip, all through server actions with optimistic rows. The stock page header gets "Add to watchlist". Drag to reorder is done: the row's grip drags with the pointer (rows make way as it passes their midpoints) or lifts with Space, moves with the arrows, drops with Space, and cancels with Escape, each step read out by a live region; the geometry and the moves are pure, unit-tested functions in `apps/web/lib/reorder.ts`, and both paths end in the one reorder call. Today shows a card per watchlist with the same closes, day changes, and sparklines, and the stocks opened last in this browser ([docs/ui-plan.md](docs/ui-plan.md), Today). The index names each list's best and worst movers: `GET /api/watchlists` carries them per list (`movers.best`, `movers.worst`), picked in `apps/api/src/watchlists/movers.ts` from the closes the rows already show, among the symbols whose last bar is the list's newest session, and compared exactly as fractions of integers (unit-tested); the whole index costs three queries however many lists there are. Not yet: the row-to-header morph (motion plan, Phase 6).
6. **Symbol universe:** load the full active US equity list from Alpaca into `Symbol` so search covers everything; candles for a newly watched symbol are fetched on demand by the bootstrap path. Done: `pnpm --filter @astraq/api symbols:sync` loads Alpaca's active, tradable US equities on a listed exchange (OTC left out: no bars on the free plan) in one `unnest` upsert and deactivates what the provider no longer lists; adding a symbol to a watchlist loads its history inline through the bootstrap service when the api has Alpaca keys (one load per symbol at a time, failures logged, the watch succeeds either way); `bootstrap --tickers` accepts any synced ticker; search without a query lists only the symbols that have candles. Not yet: a scheduled resync (Phase 4 jobs) and loading candles from the stock page itself.
7. **First D3 view — returns distribution** (`/analysis/returns?symbol=&from&to`), pulled forward from Phase 6 so the visualization goal starts early. It needs only stored candles:
   - `GET /api/symbols/:ticker/returns?from&to`: daily returns from adjusted closes with `lag()`, plus summary stats (mean, standard deviation, skew, best and worst day, share of up days) in the same SQL query. Done: `adjustment` defaults to `all` (an ex-dividend day is not a loss), the range bounds the returns so the first day in it still has one, the stats come back as one row with the series packed by `json_agg`, and the adjustment CTEs are shared with the candles query as `Prisma.sql` fragments. Checked against a hand-computed fixture across a split and a dividend (`candles.returns.int-spec.ts`).
   - a histogram with a normal-curve overlay, hand-built with `d3-scale`, `d3-array` (`bin`), and `d3-shape`. React renders the SVG; D3 only computes scales, bins, and paths. Colors come from the `chart-*` tokens. Done: `histogramLayout` in `apps/web/lib/returns-view.ts` is a pure, unit-tested function (bins of about 1.5 √n with nice edges, the normal density scaled to day counts, a mean marker); `ReturnsHistogram` maps it to SVG
   - hovering a bar shows its range and day count; the stats sit beside the chart as a table, so the numbers don't depend on the visual. Done: hover and focus report the bucket in a live caption; `ReturnStatsTable` shows the api's figures
   - linked from the stock page header and a watchlist row. The sidebar gets **Analysis**, pointing at this view until Phase 6 adds the index. Done: `/analysis/returns?symbol=&range=|from=&to=&adjustment=all|split`, with the range presets and date picker shared with the stock chart, a "Returns" button in the stock page header, a chart icon on each watchlist row, and **Analysis** in the sidebar
8. **Command palette and keyboard shortcuts** (the Phase 2 rows of [docs/ui-plan.md § App shell](docs/ui-plan.md#app-shell) and the motion plan). Done: the top bar's search box opens a ⌘K / Ctrl+K palette, a `Dialog` holding an inline Base UI `Combobox`, that lists pages, symbols (the api's search through the existing server action, debounced), actions (light/dark mode, next theme, new watchlist, the shortcut overlay, sign out), and the last six places opened from it (localStorage, read through `useSyncExternalStore`). Ranking is hand-built in `apps/web/lib/command-palette.ts`: a label prefix beats a word start, which beats a run inside a word, which beats scattered letters; hints and keywords count after the label. `apps/web/lib/shortcuts.ts` is the one list of shortcuts and a pure sequence matcher: `/` opens the palette, `?` the shortcut overlay, `g` then a letter jumps to a sidebar page (the letter sits beside each item in `lib/navigation.ts`), and the prefix expires after a second. Plain keys stay quiet inside fields, dialogs, and menus; Mod+K works everywhere. Every shortcut shows in the palette rows and in the overlay, with ⌘ or Ctrl by platform. Both helpers are unit-tested.
9. **User menu, theme menu, and Settings** (the last Phase 2 rows of [docs/ui-plan.md § App shell](docs/ui-plan.md#app-shell) and [§ Settings](docs/ui-plan.md#settings--settings)). Done: `GET /api/me`, `PATCH /api/me` (a display name, migration `account_name`), `GET /api/me/sessions` (the live sessions, newest first, the request's own marked, last use dated by the newest refresh token), and `DELETE /api/me/sessions/:id`, scoped by user id in the repository like the watchlists and covered by a controller spec. The top bar gets the theme menu (mode, theme, density as radio groups, in both shells) and the user menu (initials avatar; Settings, the shortcut overlay, Sign out). `/settings` shows the profile (name form, read-only email, member since) and `/settings/sessions` the devices, with sign-out per device and "Log out everywhere" behind a confirmation. **Settings** joins the sidebar (`g e`). Not yet (Phase 7): Security and API keys.

**Learning focus:** password hashing, token rotation, session security, cookie semantics, CSRF/CORS, rate limiting, authorization at the repository layer, SQL window functions, D3 scales and generators inside React.

**Exit criteria:**

- register → login → refresh → logout works end to end on the deployed app
- reuse of a rotated refresh token revokes the whole family (integration-tested)
- users cannot read or modify another user's watchlist (tested at API level)
- a unit test checks the returns query's stats against a hand-computed fixture
- ADR 0006: "Refresh-token rotation and reuse-detection design" — [done](docs/decisions/0006-refresh-token-rotation-and-reuse-detection.md)
- ADR 0007: "Chart composition: lightweight-charts for time-axis charts, D3 for the rest, and how D3 lives in React" — [done](docs/decisions/0007-chart-composition.md)
- **product check:** I keep my real watchlist in Veracand and stay logged in on my phone, and I've read the returns distribution of a stock I own

**Kill/pivot trigger:** if the auth core isn't stable after three weeks, ship without "log out everywhere" and fine-grained rate limits. Rotation and reuse detection are non-negotiable. Auth comes first: if the returns view would push the phase past four weeks, move it back to Phase 6 and note it under "Carried gaps".

---

## Phase 3 — Paper trading and portfolio accounting · ~3–4 weeks

**Goal:** a portfolio whose numbers you would bet on, and the tracing to prove it.

1. **Fill model ADR first.** It will be shared with the backtester in Phase 5:
   - market orders placed outside market hours fill at the next session's open
   - market orders during the session fill at the latest known price (latest daily close until realtime exists), plus configurable slippage
   - limit orders fill when a bar's range crosses the limit
   - commissions are configurable per portfolio

   Done: [ADR 0008](docs/decisions/0008-fill-model-shared-by-paper-trading-and-backtesting.md), and the model itself as two pure functions over decimal strings (`apps/api/src/trading/fill-model.ts`): `fillOnBar` for an order against a session's bar and `fillAtLastPrice` for a market order mid-session. A limit order the open has already passed fills at the open, capped at the limit; otherwise it fills at the limit only when the session trades through it (a touch doesn't fill). Slippage is basis points against the trader, on market-priced fills only. The cases in `packages/shared/fixtures/fill-model.json` are the contract the Python port must reproduce in Phase 5. Nothing calls the model until item 3.
2. **Ledger-based accounting, hand-built:** every cash and position change is an immutable ledger entry; balances and positions are *derived*. Realized PnL uses FIFO lots (average cost can come later). Done ([ADR 0009](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md)): double entry over five accounts (cash, securities at cost, capital, fees, realized PnL), where every transaction's entries sum to zero. `apps/api/src/ledger/ledger.ts` is pure: `replay` folds a history into cash, lots, and realized PnL and refuses one that doesn't add up (a sell's stored cost must be its FIFO cost), and `deposit`, `withdrawal`, `buy`, and `sell` build the next transaction or refuse it (no overdraft, no short selling). A partly sold lot keeps the cents it hasn't handed out, so partial sells never lose one. Arithmetic is a hand-built exact decimal on `bigint` (`common/decimal.ts`). Migration `ledger` adds `portfolios`, `ledger_transactions`, and `ledger_entries`; triggers make the ledger append-only and refuse an unbalanced transaction at commit. Postings are written under a row lock on the portfolio, so concurrent postings can't overdraw or fork the history (integration-tested; since 2026-11-16 the one write path is `OrdersRepository.transact`). Not yet: endpoints and pages (items 3 and 6), dividends and splits (item 4).
3. **Order lifecycle:** `Portfolio`, `Order`, `Fill`, `Lot`, `LedgerEntry`. Place, cancel, fill. **Idempotency keys** on order placement. Done (api; [ADR 0009](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md) section 7): `/api/portfolios` creates a portfolio with its starting cash and trading costs, returns its books (cash, positions at cost, realized PnL, fees, dividends), and takes deposits and withdrawals; `/api/portfolios/{id}/orders` places, lists, and cancels orders. Migration `orders_corporate_actions` adds `orders` and `fills`. An order is `open`, then `filled`, `cancelled`, or `rejected`. A market order placed during the session fills at once at the last stored close; every other order waits for the first daily bar whose session opened after it was placed. The rules are pure functions (`apps/api/src/trading/settlement.ts`): the repository locks the portfolio's row, reads the ledger, open orders, bars, and corporate actions, lets `settle`, `place`, or `cancel` decide, and writes the order, its fill, and the ledger transaction in one database transaction. Placement requires an `Idempotency-Key` header, looked up under that lock: the same key returns the first order, and the same key with a different order is a 409. Nothing runs on a schedule yet, so a portfolio settles when it is read or written; settling twice writes nothing. A deposit or withdrawal goes through the same path and settles first (`transfer` in `settlement.ts`), so cash moved today can't pay for, or be taken from under, a fill that already happened. Since item 5 an order is also checked when it is placed, and the session clock reads the exchange calendar. The Orders tab and the order ticket are item 6.
4. **Corporate actions:** applying a split adjusts open lots. Dividends credit cash on the pay date. Done ([ADR 0009](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md) section 8), as part of settlement. A split converts every lot bought before its ex-date (shares × to / from, cost unchanged) with one ledger entry that moves no money, cancels the orders placed before it, and divides the last close a market order fills at on the ex-date. A dividend is booked on its ex-date as income and a receivable, for the shares bought before that day, and becomes cash on its pay date (`corporate_actions.pay_date`, now loaded from Alpaca; the ex-date when the provider gives none). The ledger gained the kinds `split`, `dividend`, and `dividend_payment` and the accounts `dividends_receivable` and `dividend_income`. Limit: an action loaded after the fact is applied late (a dividend whose shares were already sold is missed), which Phase 4's ingestion closes.
5. **Risk rules:** market-calendar awareness (Alpaca calendar), max order notional, insufficient-cash and short-selling guards. Done ([ADR 0009](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md) section 9), in two slices:
   - **Guards at placement** — done: `assess` in `apps/api/src/trading/risk.ts` (pure) refuses a sell of more shares than are held and not promised to open sell orders, an order over the portfolio's `maxOrderNotional` (new, set at creation, null for no limit), and a buy the cash doesn't cover after what open buy orders are expected to take. A market order is estimated at the latest close with slippage and a limit order at its limit, both through the fill model (`fillAtLimit` is new). A refusal is a 422 whose detail says why, and the order isn't stored. `POST .../orders/preview` runs the same function (`preview` in `settlement.ts`) and returns the timing, the session it fills in, the estimate, the cash after, and the refusal. Both run under the portfolio's lock after settling. The check at the fill stays: prices move between the two.
   - **Exchange calendar** — done: migration `risk_rules` adds `market_sessions` (and `portfolios.max_order_notional`). `calendar:sync` loads Alpaca's calendar from 2016 to the end of next year, and `MarketCalendarService` reloads the year ahead when less than a week is stored. `isRegularSession` and the new `nextSession` in `market-hours.ts` take the calendar as a value and fall back to the weekday rule for a date it doesn't cover. Not yet run against the live Alpaca endpoint (no keys on the machine it was built on): the response shape is the documented one.
6. **Portfolio screens:** holdings, cash, realized/unrealized PnL, equity curve, orders and fills — the `/portfolios` routes and the order ticket in [docs/ui-plan.md](docs/ui-plan.md). In slices, each a page with real data:
   - **Positions priced (api)** — done: `GET /api/portfolios/{id}` returns each position's `lastPrice`, `priceDate`, `marketValue`, and `unrealizedPnl`, and the portfolio's `marketValue`, `unrealizedPnl`, and `equity`. The price is the latest stored close in the shares that trade today (a split that has gone ex after that bar is applied in SQL), and the sums are pure functions (`trading/valuation.ts`). A position without a bar has no price, and then the totals are null rather than partial.
   - **`/portfolios` and Holdings** — done: the list with each portfolio's equity, cash, and total return, and the form that creates one; `/portfolios/[id]` with the figures, the positions table (cash as its last row), and deposits and withdrawals; **Portfolio** in the sidebar, the palette, and `g p`. The web does one piece of money arithmetic, equity less capital for the total return, in whole cents on `bigint` (`apps/web/lib/money.ts`). With one portfolio `/portfolios` opens it directly.
   - **Orders tab and the order ticket** — done: `/portfolios/[id]/orders` lists every order with its status, its fill (price, amount, commission, the rule and session that priced it) or the reason it ended without one, and cancels an open one. The ticket is a `Drawer` (`OrderTicket.tsx`) opened by Trade on the portfolio pages, on a holdings row, and on the stock page: symbol, side, market or limit, shares. While it is filled in it calls the preview endpoint (debounced) and shows when the order fills, the estimated price, cost, commission, and cash after, and the api's refusal, which also disables the button. The idempotency key is made when the ticket opens. A submitted order shows on the Orders tab at once ("Placing") through a small client store (`lib/pending-orders.ts`) and goes again with a toast if the api refuses it; a cancel marks its row at once.
   - **A dollar amount, and the ticket in the palette** — done (2026-11-21). `PlaceOrderBody` takes `amount` in place of `quantity`. `preview` in `settlement.ts` sizes it under the portfolio's lock with `sharesFor` (`risk.ts`): the amount divided by the price the estimate uses (`quotedPrice` in the fill model: the latest close with slippage, or the limit), rounded down to a millionth of a share, so the estimate never comes to more than the amount; the commission is on top. The preview returns the shares as `quantity`, and `place` is given them, so the order is stored and fills in shares like any other. Migration `order_amount` adds `orders.amount`, which the order keeps and returns: a repeat of an idempotency key is compared by the amount, because the shares depend on the price at the time. An amount without a price to size it by, or one that comes to less than a millionth of a share, is a new refusal, `unsized` (a 422 at placement). On the web the ticket has a Shares / Dollars switch, and the preview shows the shares an amount comes to. The command palette has "New paper order" (found by trade, buy, sell, order), which reads "Trade NVDA" on a stock page and opens the ticket for that symbol; the drawer loads the portfolios itself (`OrderTicketDrawer`, `listTicketPortfolios`), since the palette opens on any page.
   - **Activity tab** — done: `GET /api/portfolios/{id}/activity` returns the ledger newest first, one line per transaction: its kind, symbol, shares, the fill's price and order, commission, a sell's realized PnL, a dividend's amount, a split's ratio, the change in cash, and the cash after (`timeline` in `apps/api/src/ledger/activity.ts`, pure). `/portfolios/[id]/activity` renders it; the top line's cash after is the cash on Holdings. `Position` gained `lots` (opened on, shares, cost; oldest first), and a holdings row opens to them. The three pages share a header with the tabs (`PortfolioHeader.tsx`).
   - **Equity curve and day PnL** — done: `GET /api/portfolios/{id}/equity` returns a point per day, oldest first: `equity` (cash, dividends owed, and the shares held that evening at that day's closes), `capital` (paid in less withdrawals), and `pnl`, the day's change in equity less the cash paid in or out that day, so a deposit is not a gain. `equityCurve` in `apps/api/src/trading/equity-curve.ts` is pure: it applies the ledger's transactions a day at a time with the ledger's own `apply` and prices each evening with `valuePortfolio`, so the last point is the Holdings equity and every `pnl` added up is equity less capital (both unit-tested, and checked against the database in `orders.int-spec.ts`). A close is brought to the shares held that day across any split in between, the way settlement converts the lots. The closes come from one SQL query that starts each symbol at its last bar on or before the ledger's first day. On the web, Holdings shows Day PnL beside the other figures and the curve as a `lightweight-charts` area over a dashed line of the cash paid in (`EquityChart.tsx`, [ADR 0007](docs/decisions/0007-chart-composition.md): time on the x axis); a readout above it follows the crosshair. `/portfolios` gained a Day PnL column.
   - **Today and the stock page** — done (2026-11-20), the Phase 3 rows of [docs/ui-plan.md](docs/ui-plan.md) outside `/portfolios`. Today shows a card per portfolio (equity with the total return, day PnL, cash, open orders) and the market status. The status is a new endpoint, `GET /api/market/status`, answered by `marketStatus` (pure, beside `isRegularSession` and `nextSession`, which it calls), so the page shows the clock an order meets; `calendar` says `weekdays` when a day involved isn't in the stored calendar, and the page then says holidays aren't known. The stock page shows the position per portfolio that holds the symbol and marks the user's fills on the chart: B under the bar of a buy's session, S over a sell's, with the fills of the bar under the crosshair in the readout and a sentence under the chart counting them. A fill is placed by its session, not its price, so the split adjustment can't misplace it; one whose bar isn't stored yet (a market order filled mid-session) sits on the latest bar (`placeFills` in `apps/web/lib/stock-chart.ts`). Both pages are built from the existing portfolio and order endpoints.
7. **Tracing:** OpenTelemetry in `apps/api` and the web BFF, with a span per order placement and propagation web → api → database. Local Jaeger in compose. Done, by hand from the SDK's parts instead of `sdk-node` (a tracer provider with a batch processor and an OTLP/HTTP exporter, the AsyncLocalStorage context manager, the W3C propagator), so each part is visible:
   - **Api** (`apps/api/src/tracing.ts`, imported first by `main.ts` so the modules are patched before Nest loads them): `http` makes a span per request (health probes left out) and stamps it with `http.request.id`, the id in the log lines; `express` names it by its route; `pg` makes a span per SQL statement Prisma's driver runs. `OrdersService.place` runs inside `order.place` (`inSpan` in `common/span.ts`), which carries the portfolio, the order, and how it came out. A 4xx the api chose, such as a refused order, is recorded on the span without marking it an error. The batch is flushed on shutdown (`TracingShutdown`).
   - **Web** (`apps/web/lib/tracing.ts`, started from `instrumentation.ts` on the Node runtime only): Next makes the spans for a request, its rendering, and its server actions; the undici instrumentation adds a span per call to the api and writes `traceparent`. The `placeOrder` action runs inside `order.submit`.
   - **Jaeger** v2 in `infra/docker/compose.yml`, traces in memory, UI on port 16686. `OTEL_EXPORTER_OTLP_ENDPOINT` is validated with the rest of the env in both services and defaults to it in development only.
   - Checked locally by placing an order through the web's server action: one trace, web `order.submit` → the api's `POST /api/portfolios/:id/orders` → `order.place` → `BEGIN`, the `FOR UPDATE` lock, the reads, the `INSERT`, `COMMIT`. Not yet: a collector for the deployed app, the trace id in the log lines themselves, and anything from the browser (the trace starts at the web server).
8. **Backups:** automated nightly Postgres backups on the host — paper trades are now data worth keeping.

#### Audit follow-ups

What the 2026-11-16 review found is fixed (see the revision log). One thing is left, and it needs a browser:

- **Keyboard reorder** (`lib/use-reorder.ts`, used by `WatchlistItemsTable.tsx`): a lifted row that moves down is re-inserted in the DOM and loses focus. The grip now takes focus back after every step, and a blur cancels the lift only if it sticks. Written from the code, not yet tried with a keyboard: lift a row with Space, press ArrowDown twice, drop it, and check a drag with the pointer still works.

Not reviewed in that pass: `packages/ui`, `services/ml`, the CI workflow, and the Docker files.

**Learning focus:** transactions and isolation levels, invariants, double-entry thinking, decimal math, idempotency, instrumentation.

**Exit criteria:**

- property-based tests (fast-check) prove invariants: cash + market value reconciles with the ledger, no negative positions without short permission, and replaying the ledger reproduces the state — done for the ledger itself (`ledger.spec.ts`: cash plus shares at cost plus dividends owed equals capital plus realized PnL and dividend income less fees after every step, across random buys, sells, splits, and dividends; nothing goes negative; and replay rebuilds the state); market value joins when positions are priced (item 6)
- concurrent duplicate order submissions with the same idempotency key produce exactly one order (integration test against real Postgres) — done (`orders.int-spec.ts`: ten concurrent placements, one order, one fill, one ledger transaction)
- a split on a held symbol leaves the portfolio's market value unchanged — done at cost and share count (`ledger.spec.ts`, `settlement.spec.ts`, `orders.int-spec.ts`: ten times the shares, the same cost, a tenth of the price); the priced figure joins with item 6
- every order is traceable from browser request to SQL statement — done locally (item 7: one trace from the web server's handling of the browser's request to each SQL statement, in Jaeger); on the deployed app it waits for a collector
- ADR 0008: "Fill model shared by paper trading and backtesting" — [done](docs/decisions/0008-fill-model-shared-by-paper-trading-and-backtesting.md)
- ADR 0009: "Ledger accounting and order transaction boundaries" — [done](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md), including the order boundary (section 7) and corporate actions (section 8)
- **product check:** I placed at least five paper trades in a week and the PnL matched my own spreadsheet

**Kill/pivot trigger:** if PnL drifts between sessions, stop adding features until the property tests find the bug.

---

## Phase 4 — Market data pipeline · ~3 weeks

**Goal:** replace the bootstrap with ingestion you never have to think about.

1. **`MarketDataProvider` contract** with Alpaca and Yahoo adapters. Contract tests run the same suite against both, using recorded fixtures. Done ([ADR 0010](docs/decisions/0010-provider-contract-and-failure-modes.md)):
   - **The contract** (`apps/api/src/market-data/provider/market-data-provider.ts`): raw daily bars and corporate actions for some tickers over a range, in the database's conventions (session date at 00:00 UTC, decimal strings, a dividend as paid), "no data" as an empty answer, and every failure a `ProviderError` that says whether a retry can help (`rate_limited`, `unavailable`, `rejected`, `malformed`; decided in `provider-http.ts`). The asset list and the exchange calendar stay Alpaca's.
   - **Adapters:** `AlpacaProvider` wraps the existing client and mapper. `YahooProvider` (`yahoo/`) is a hand-written client for the chart endpoint: it undoes Yahoo's split adjustment on prices, volume, and dividends (a second request finds the splits after the range), reads the printed floats as exact decimals and rounds to the tick, and turns a 404 into "no data".
   - **One write path:** `IngestionService` replaces `BootstrapService` and takes whichever provider is configured (`provider.env.ts`: Alpaca with keys, Yahoo only when `MARKET_DATA_PROVIDER=yahoo`). The bootstrap CLI, the first watch of a symbol, and the jobs all go through it. No failover between providers: one series, one source.
   - **Contract tests** (`provider.contract.spec.ts`): one suite over both adapters, each replaying its recorded HTTP exchanges of Apple around its 2020 split. `fixtures:record` records them. The Yahoo fixture is a recording; the Alpaca one is built by hand until someone with keys records it.
2. **BullMQ jobs:** symbol backfill, end-of-day refresh, corporate-action refresh. Retries with backoff, a dead-letter queue, idempotent upserts. Done (`apps/api/src/market-data/jobs/`), with `bullmq` used directly rather than through `@nestjs/bullmq`, and the parts BullMQ leaves open written by hand:
   - **Jobs** (`market-data.jobs.ts`): the three payloads as Zod schemas, parsed again by the worker. `planRefresh` cuts the tracked symbols (active, with at least one bar) into one job per provider batch; a batch's range starts before its stalest symbol's last bar, so a gap fills without anyone tracking gaps.
   - **Backoff** (`retryDelayMs`): doubling from 30 seconds to a 30-minute cap, the upper half of each wait random, never shorter than a provider's `Retry-After`. Eight attempts, about an hour.
   - **Dead letters** (`market-data.queue.ts`, `market-data.worker.ts`): a second queue with no worker. A job that fails in a way a retry can't fix (a rejected or malformed provider answer, a bad payload) or runs out of attempts is copied there before it is marked failed; `jobs dead` lists them and `jobs retry-dead` puts them back.
   - **Idempotent writes:** the upserts the bootstrap already had, now reached only through `IngestionService`.
   - **Processes:** `pnpm --filter @astraq/api worker` is its own process, not part of the api server; `pnpm --filter @astraq/api jobs ...` enqueues. Checked locally against real Redis and Postgres with the Yahoo provider: two backfills, a refresh that refilled 13 deleted bars, and a second refresh that wrote none. The integration test (`market-data.worker.int-spec.ts`) covers retry, backoff, the dead-letter queue, and replay on real Redis, which CI now starts.
   - Not yet: the worker in `pnpm dev` or the deploy (see item 3).
3. **Scheduling from the exchange calendar**, not from cron guesses: refresh after the close on trading days only; handle half days. Done (`apps/api/src/market-data/jobs/session-scheduler.ts`):
   - **The schedule is jobs, not a timer.** Each session has one delayed `session-close` job with an id of its own, due 30 minutes after the close the calendar gives (`closeDelayMs`), so a half day's is due at 13:30 New York and a holiday has none. Running it schedules the next session's job first, then enqueues the day's work. No cron expression, no `@nestjs/schedule`, nothing that lives in a process: the schedule is in Redis and survives a restart.
   - **Catch-up.** `ensure` asks for two jobs, the next session to close and the last one that has (`lastClosedSession`, `nextSessionToClose` in `trading/market-hours.ts`). The worker calls it when it starts and every close calls it again; a job that exists in any state isn't added twice (`addOnce`). A worker that was down over a close therefore runs that session at once, and `planRefresh` reaches back to each symbol's last bar, so one late job fills every missed day.
   - **One flow per session** (`RefreshService.enqueueSessionRefresh`, `MarketDataQueue.addThen`): the bar batches and the corporate-action batches are the children of a `data-quality-check` job, which BullMQ runs once they are over. A child that is given up on is dead-lettered and stops counting (`ignoreDependencyOnFailure`), so the check still runs and reports the symbols left stale.
   - **Without the calendar** (no Alpaca keys) the clock is the weekday rule the order rules fall back to: a holiday gets a refresh that finds no bars.
   - **Alpaca's delay:** a bars request now ends no later than 16 minutes ago, because the free plan refuses the last 15 minutes of SIP data and the refresh asks for today's bar half an hour after the close. Written from the documented rule; not tried against Alpaca.
   - **Where the worker runs:** a Railway service of its own from the api's image (`apps/api/railway.worker.json`, [docs/deploy.md](docs/deploy.md)). Not in `pnpm dev`: it needs a provider.
   - Checked locally on Yahoo with real Redis and Postgres: a first start scheduled the last and the next session, the last one's refresh and check ran, a second `ensure` added nothing, and after deleting two weeks of one symbol's bars and the session's job (a missed close) a restart refilled the 9 bars and the check went from one stale symbol to none. Tests: `session-scheduler.spec.ts` (Thanksgiving week: the holiday skipped, the half day at 18:30 UTC, the weekday fallback) and `market-data.worker.int-spec.ts` (once per id; the flow's last job after a dead-lettered step).
4. **Data quality checks:** missing sessions, duplicate bars, OHLC sanity (low ≤ open/close ≤ high), stale symbols. Failures surface on `/status`. Done (`apps/api/src/market-data/quality/`):
   - **The checks**, over the active symbols that have bars. *Missing sessions:* a session in `market_sessions` between a symbol's first and last bar without a bar (a whole-day halt shows up here, and is true). *Duplicate bars:* two bars on one date, or a bar equal to the previous session's in every price and the volume, with volume above zero; the primary key already prevents the plain duplicate. *OHLC sanity:* low above the open or close, high below them, a price of zero or less, negative volume. *Stale symbols:* a last bar before the session the check was run for. The first three are SQL (`data-quality.repository.ts`), each returning the newest 25 findings and the count of all.
   - **Storage:** one row per run in `data_quality_runs` (a count per check, the sample as JSON), kept three months. `missing_sessions` is NULL when no calendar is stored: the check is reported as not run, not as passed.
   - **Surface:** `GET /api/market/data-quality` (public, like the market status) serves the latest run with a status per check, the session a run is due for, and `current`: false when the latest run is older than the last session that closed three hours ago or more, so a worker that stopped doesn't leave a green page behind. `/status` shows a badge for the whole and a row per check with its most recent findings (`DataQualityPanel.tsx`).
   - **Reports, doesn't repair.** A stale symbol is retried by the next refresh; the other three mean the provider sent something wrong and a person should look.
   - Checked: the SQL against real Postgres with one planted defect per check (`data-quality.repository.int-spec.ts`), the endpoint against a running api, and the run itself in the local worker. The `/status` section was typechecked and its wording unit-tested, not opened in a browser.
5. **Timescale maintenance:** compression and retention policies, a continuous aggregate for weekly bars. Done, without the retention policy (migration `20261125120000_candles_compression_weekly`):
   - **Compression:** `candles_daily` is compressed with `segmentby = symbol_id`, `orderby = ts DESC`, and a daily policy compresses a chunk (one year) once all of it is 90 days old. The primary key is covered by the two settings, so `INSERT ... ON CONFLICT` and the cascade from `symbols` keep working on compressed chunks; the next run packs again what a write unpacked.
   - **No retention policy.** A retention policy drops whole chunks by age, and each chunk here is the only copy of a year of history that the adjustment query reads all the way back. It moves to Phase 9 item 2, where raw 1-minute bars age out and the aggregates over them stay.
   - **Weekly bars:** `candles_weekly`, a continuous aggregate (`time_bucket('1 week')`, Monday 00:00 UTC; `first`/`max`/`min`/`last`/`sum`, and the week's first and last session). Real-time aggregation serves the weeks after the last refresh. A policy refreshes hourly, but a write to an already materialized week would be invisible until then (a backfilled symbol would have no weekly bars for up to an hour), so `IngestionService` refreshes the weeks it wrote (`MarketDataRepository.refreshWeeklyBars`).
   - **Reading them** (`CandlesRepository.findWeekly`, `GET /api/symbols/:ticker/candles?interval=1w`): the aggregate holds raw prices, and one factor adjusts a week only when all its days share it. Weeks with an ex-date inside are rebuilt from adjusted daily bars; the rest are the aggregate's row times one factor. The stock page has a Daily / Weekly switch.
   - Checked on Yahoo data with real Postgres: for Apple and NVIDIA over ten years, every weekly bar under `raw`, `split`, and `all` equals the week rebuilt from the daily endpoint (569 weeks each), before and after compressing 12 of 13 chunks, after refilling 124 deleted bars through `eod-refresh`, and after a backfill that upserted into compressed chunks. Tests: `candles.repository.int-spec.ts` (a split inside a week, a dividend inside a week, a split on a Monday, the range).
6. **Redis caching** for hot reads (latest bar per symbol, symbol search). Done (`apps/api/src/common/cache-store.ts`, `apps/api/src/market-data/cache/`), by hand on `ioredis` rather than `@nestjs/cache-manager`:
   - **What is cached:** a symbol's latest close, one key per symbol (`MGET` for a list of them; a symbol without bars is cached as null), for an hour; a search's rows by its query, for ten minutes. Search results and watchlist rows read through it. Valuation, the order checks, and settlement don't.
   - **Invalidation:** the one writer does it. `IngestionService` deletes the closes of the symbols whose bars or corporate actions it wrote. A search can't be deleted by key, so its key carries a generation counter and invalidating is `INCR`: ingestion and `symbols:sync` bump it. The TTLs only bound what invalidation can't reach.
   - **Failure:** a Redis error is a miss, logged; the read goes to Postgres.
   - **One Redis:** the queue needs `noeviction`, so the cache can't lean on eviction. Every key has a TTL.
   - Checked against a running api and Redis: a search stored its rows and its closes, the same search in another case reused the key, and a refresh job moved the generation. Tests: `market-data-cache.spec.ts`.
7. **MongoDB enters:** an append-only archive of raw provider responses (schema varies by provider and version, TTL index, replayable into the normalizer), accessed through a second Prisma client (MongoDB connector). Add Mongo + Mongo Express to compose.
8. Bull Board (or equivalent) behind admin auth to inspect queues.

**Learning focus:** adapter pattern, contract testing, queue design, retry semantics, data quality, time-series storage policies, document modeling.

**Exit criteria:**

- any watched symbol stays fresh automatically for two weeks with no manual action
- replaying one archived raw payload reproduces the stored bars exactly
- ADR 0010: "Provider contract and failure modes" — [done](docs/decisions/0010-provider-contract-and-failure-modes.md)
- ADR 0011: "MongoDB vs Postgres JSONB for the raw payload archive" — if JSONB wins, drop Mongo and say so
- **product check:** I haven't run the bootstrap script by hand in two weeks

**Kill/pivot trigger:** if the second adapter costs more than a week, ship with Alpaca only. The contract is the deliverable, not the number of providers.

---

## Phase 5 — Strategy DSL and backtesting v1 · ~4 weeks

**Goal:** close the core loop — define a rule, test it honestly, trade it on paper.

1. **Strategy DSL** as a versioned JSON structure defined in Zod in `packages/shared`:
   - indicators (SMA, EMA, RSI, ATR, Bollinger), comparisons, crossovers, AND/OR
   - entry rules, exit rules, stop-loss / take-profit, position sizing (fixed notional or % of equity)
   - `version` field from day one
   - exported to JSON Schema → Pydantic models in `services/ml`, with CI checking for drift
2. **Event-driven backtester, hand-built in Python** (`services/ml/app/backtest/`): bar events → strategy → signals → orders → fills, using the **same fill model as Phase 3** (ported and tested against shared fixtures).
3. **Bias guards by construction:**
   - a signal computed on bar *t* can only fill at bar *t+1* or later
   - the engine only sees data up to the current bar (point-in-time iterator, no dataframe look-ahead)
   - adjusted prices for signals, raw prices plus corporate actions for fills and cash
   - delisted symbols stay in the universe for dates when they traded
4. **Job flow:** api validates and stores the strategy → enqueues a BullMQ backtest job → Python worker runs it → result returns through the job → api persists `BacktestRun` + trades + equity curve.
5. **Metrics:** CAGR, volatility, Sharpe, Sortino, max drawdown and duration, win rate, exposure, turnover — always next to a **buy-and-hold benchmark**.
6. **UI:** strategy builder form (templates for SMA crossover, RSI threshold, breakout), run list, result page with equity curve vs benchmark, drawdown pane, and trade markers on the candle chart. Restore `/strategies` and `/backtests`.
7. **Paper-trade a strategy:** a daily job evaluates saved strategies after the close and places paper orders through the Phase 3 order path.

**Learning focus:** event-driven design, cross-language contracts, job orchestration, quantitative evaluation, result visualization.

**Exit criteria:**

- the same strategy + data + seed produces byte-identical results (golden-file test)
- a **parity test** shows backtest fills match fills from replaying the same signals through the paper-trading engine
- a deliberately leaky strategy (peeking at tomorrow's close) is rejected or has no effect
- ADR 0012: "Strategy DSL shape and versioning"
- ADR 0013: "Bias guards in the backtest engine"
- **product check:** a strategy I care about has been running on a paper portfolio for two weeks

**Kill/pivot trigger:** if the DSL design runs past a week without a backtest running, freeze it at SMA crossover + RSI threshold and move on.

---

## Phase 6 — Analysis dashboard and research journal · ~3 weeks

**Goal:** make Veracand the tab you open every morning.

1. **Symbol page upgrade:** multi-pane layout with synced crosshairs, indicator overlays (EMA/SMA/Bollinger), RSI/MACD panes, markers for your fills and strategy signals.
2. **Analysis views:** an `/analysis` index, watchlist performance table, relative performance comparison, drawdown chart, seasonality heatmap (`d3`), a year-over-year comparison (one line per year on one January-to-December axis), and "after a move like this" (what followed past moves of the same size). The last two are described in [docs/forecasting-plan.md](docs/forecasting-plan.md), "What you look at": they need only stored candles, and each shows how many cases it rests on. The returns distribution already shipped in Phase 2.
3. **Saved chart layouts** (Postgres `JSONB` — relational ownership, flexible payload).
4. **News per symbol** from a free source into MongoDB, shown on the symbol page.
5. **Research journal:** notes attached to a symbol, trade, or backtest run, with tags and full-text search. Use Mongo or Postgres per the Phase 4 ADR.
6. Mobile layout pass across all core pages.

**Learning focus:** chart performance, visualization design, progressive hydration, document modeling, full-text search.

**Exit criteria:**

- core pages are usable at phone and desktop widths
- symbol page interaction stays under 100 ms on 10 years of daily bars (measured)
- the chart split from ADR 0007 still holds, or ADR 0007 is amended with the measurements
- **product check:** Veracand replaced one daily habit (finviz, TradingView lite, a spreadsheet)

**Kill/pivot trigger:** if sourcing news is harder than displaying it, ship charts and the journal without news.

---

## Phase 7 — Account hardening · ~2 weeks

**Goal:** make accounts safe enough to invite someone else.

1. Email verification and password reset (Mailhog locally, a transactional email provider in prod).
2. TOTP 2FA with recovery codes.
3. Personal API keys (hashed, scoped, revocable) for scripts and bots.
4. Roles: `user`, `admin` (add `pro` only if billing ever happens).
5. Admin-only operational pages (queues, data quality, users).
6. Replace the invite allowlist with verified open registration, or keep invites — decide in the ADR.

**Learning focus:** email flows, OTP, key management, authorization models.

**Exit criteria:**

- a new user can register, verify, enable 2FA, reset their password, and recover with a recovery code
- ADR 0014: "2FA and API-key design"
- **product check:** a friend signed up without my help

**Kill/pivot trigger:** if email deliverability eats the phase, keep invite-only and ship 2FA + API keys.

---

## Phase 8 — Forecasting and signals · ~6–8 weeks

**Goal:** add research depth without faking predictive power.

The detail is in [docs/forecasting-plan.md](docs/forecasting-plan.md): what each model predicts, its naive baseline, how it is scored, and the data it needs. In short: a symbol's own past prices say little about where its price goes next, so the phase forecasts what is predictable (volatility and price ranges), states every forecast as a range with a probability, adds information beyond the symbol's own prices (the market, the sector, earnings dates, fundamentals, news), and shows each model's out-of-sample score beside its forecast.

**Core** (needs only the data already stored):

1. `services/ml` structure: `app/api`, `app/core`, `app/data`, `app/features`, `app/models`, `app/backtest`, `app/workers`.
2. **Feature pipeline** (polars): returns, rolling volatility, RSI, MACD, ATR, OBV — computed point-in-time, shared with the backtester.
3. **Walk-forward validation harness first**, before any model: expanding window, embargo gap, purging, naive forecasts per target, and a statistical test for "beats naive" (Diebold-Mariano, corrected for overlapping horizons, and a check that the best of several variants is not best by luck).
4. **Volatility models**, in order: EWMA → range-based estimators from the stored highs and lows, up to Yang-Zhang, which counts the overnight gap → GARCH(1,1), fitted by hand first, then GJR-GARCH → HAR.
5. **Calibrated price bands** (50% and 80%, 1 / 5 / 20 sessions ahead): from the volatility forecast, then conformal calibration that keeps adjusting as the market changes, each edge on its own, so an 80% band holds about 80% of the time in calm and in stressed markets. Forecasts are job results the api stores; each served model has a model card.
6. Forecast bands on the symbol chart and the Forecast tab, with each model's out-of-sample score next to its forecast.
7. **Forecast scorecard:** every stored forecast is scored when the day it was about arrives. The live record is the one score that can't be overfit. Two views read it: the **time machine** (pick a past date on the chart and see the band forecast that day with the candles that followed) and the **Model lab** (`/analysis/models`: every served model's score against naive, out of sample and live, over time and per regime, with a calibration chart; a model that stops beating naive is marked so).

**Extensions** (each stands or falls by its own score; drop any that the time box doesn't fit):

8. **VIX and the direction model.** VIX (from FRED) joins HAR as one more input, scored against HAR without it. The direction model uses market, sector, and regime features and is trained on all symbols together: logistic regression, then gradient boosting, reported against the base rate whatever the result. Needs index and sector ETF bars in the tracked universe, and a FRED loader.
9. **Earnings and macro calendars:** bands widen across earnings days by the symbol's past earnings moves, and across rate-decision, inflation, and jobs-report days the same way. Needs an earnings data source (an ADR picks it) and the macro dates (FRED's release dates and the Federal Reserve's meeting calendar).
10. **Ranking across stocks:** momentum, reversal, and low-volatility factors, then fundamentals by filing date. Scored by monthly rank correlation and a top-less-bottom backtest with costs. Not built until the tracked universe has a few hundred symbols: a ranking of 20 or 30 is scored mostly by luck.
11. **News sentiment** as a feature, scored as the increment over the same model without it (needs Phase 6's news).
12. **Model averaging**, and **ML signals become DSL inputs**, so the Phase 5 backtester evaluates them like any other rule.
13. MLflow only if you're comparing more than a handful of runs a week.

**Learning focus:** time-series validation, feature engineering, statistical modeling, calibration, model serving, experiment hygiene.

**Exit criteria:**

- every served model has a model card: data window, validation method, out-of-sample metrics vs naive baseline
- the leakage test suite passes (shuffled-target and future-feature canaries)
- the 80% band holds between 75% and 85% of the time out of sample, overall and in each regime
- a past forecast can be replayed on the chart from the stored forecasts
- ADR 0015: "Time-series validation strategy"
- **product check:** I read a forecast band on a chart I care about and can say whether it beats naive

**Kill/pivot trigger:** if four weeks pass without a model beating naive out of sample, ship the volatility bands (GARCH) and the harness — an honest "no edge" result is a valid outcome. The extensions are cut before the core.

---

## Phase 9 — Realtime and alerts · ~3–4 weeks

**Goal:** make Veracand feel alive without making it fragile.

1. **`services/ingest`** (Python): Alpaca websocket (IEX) for watched symbols → Redis Streams, with reconnects, heartbeats, and gap backfill.
2. Intraday bars (1-minute hypertable + continuous aggregates, and a retention policy: raw minutes age out, the aggregates stay; see Phase 4 item 5). Paper-trading fills move to latest-trade price during the session.
3. **Live updates over SSE** (simpler than websockets for one-way data): latest price, portfolio PnL, triggered alerts.
4. **Alerts:** price and indicator conditions, strategy signals; delivered in-app, by email, and optionally by Telegram. Deduplicated with cool-downs.
5. Optional second adapter: Binance for 24/7 crypto, exercising the calendar abstraction.

**Learning focus:** streaming trade-offs, backpressure, reconnection logic, event-driven UI, operational safety.

**Exit criteria:**

- ingest survives a full trading week including a forced restart, with gaps backfilled automatically
- alerts arrive within 60 seconds of the triggering condition
- ADR 0016: "Redis Streams + SSE for this scope"
- **product check:** an alert changed what I did that day

**Kill/pivot trigger:** if ingest can't stay up for a week, fall back to 5-minute polling and keep alerts.

---

## Phase 10 — Operate: observability, performance, reliability · ~3 weeks

**Goal:** run Veracand like a small production system. There's real traffic by now, so the dashboards mean something.

1. OpenTelemetry across web, api, ml workers, and ingest; metrics to Prometheus + Grafana (or Grafana Cloud's free tier).
2. Dashboards: API latency, queue depth, job failures, ingestion lag, data freshness, model serve time.
3. **SLOs** with alerting: candle freshness, API p95 latency, alert delivery time.
4. Load tests (k6) on candle reads, order placement, and backtest submission; fix the slowest queries using `EXPLAIN ANALYZE`.
5. **Restore drill:** restore Postgres (and Mongo, if kept) from backup into a fresh environment, and time it.
6. Secrets move to Doppler or SOPS. Staging environment. A documented rollback procedure.
7. Complete the test pyramid: SDK contract tests, and Playwright journeys for login → watchlist → backtest → paper trade.

**Learning focus:** SLO thinking, production debugging, performance tuning, disaster recovery.

**Exit criteria:**

- three SLOs defined, visible, and alerting
- a real restore performed and documented, with the measured recovery time
- ADR 0017: "SLOs and what they protect"
- **product check:** I found and fixed a production issue from a dashboard, not a bug report

**Kill/pivot trigger:** if deploys keep breaking, freeze features and harden CI/CD before anything else.

---

## Beyond v1 — research and stretch

Only after the core loop has been in weekly use for a month.

- **Trading depth:** partial fills and latency modeling, options with payoff diagrams and Greeks, factor exposure, event-sourced order history.
- **Research depth:** regime detection, parameter sweeps with overfitting guards (deflated Sharpe, walk-forward optimization), portfolio-level backtests.
- **Platform comparisons:** GraphQL gateway vs REST + SDK, gRPC between api and ml, Kubernetes deployment.
- **AI depth:** an LLM research assistant grounded in your journal and news, and natural language → strategy DSL (validated by the same Zod schema).

---

## Learning map

| Skill | Where it's learned |
|---|---|
| SQL, indexing, time series | Phase 1 (adjustment query), Phase 4 (policies, aggregates), Phase 10 (query tuning) |
| Transactions and invariants | Phase 3 (ledger, idempotency, isolation) |
| Auth and security | Phase 2 (core), Phase 7 (hardening) |
| API design and contracts | Phase 1 (OpenAPI/SDK), Phase 5 (cross-language DSL) |
| Queues and distributed jobs | Phase 4 (ingestion), Phase 5 (Node → Python workers) |
| Document databases | Phase 4 (raw archive), Phase 6 (news, journal) |
| Python engineering | Phase 5 (engine), Phase 8 (ML), Phase 9 (ingest) |
| Quant correctness | Phases 1, 3, 5, 8 (adjustment, fills, bias guards, validation) |
| Frontend and visualization | Phase 1 (first chart), Phase 2 (first D3 view), Phase 6 (dashboard), Phase 9 (live UI) |
| Operations | Phase 0 (CI), Phase 1 (deploy), Phase 3 (tracing), Phase 10 (SLOs, DR) |

**Estimated total:** roughly 37–44 weeks at 10–12 hours/week for Phases 0–10. Re-estimate at the start of every phase.

---

## Revision log

**2026-11-25 — Storage policies and the cache (Phase 4 items 5 and 6).** Decisions the roadmap left open. **Retention:** not added. The item asked for a retention policy, and on daily bars it would delete the product; it is written into Phase 9 item 2, with the 1-minute bars. **Compression:** by symbol, a 90-day threshold on one-year chunks, so the chunk the refresh writes into is never compressed; writes into compressed chunks were tried rather than assumed (TimescaleDB 2.17 unpacks the one symbol's batches). **Weekly bars:** the aggregate keeps raw prices, because adjustment is a query-time step everywhere else; the price of that is a reader that rebuilds the few weeks an ex-date falls inside from daily bars. The alternative, an aggregate of adjusted prices, would have to be recomputed over a symbol's whole history at every dividend. Ingestion refreshes the aggregate itself: the hourly policy alone left a newly backfilled symbol without weekly bars for up to an hour, which showed up in the first trial. The api gained `interval` on the candles endpoint and the stock page a switch, since an aggregate nothing reads isn't a feature. **Cache:** written by hand over `ioredis` (cache-aside, per-symbol keys read with `MGET`, generation counters for searches) instead of `@nestjs/cache-manager`, whose interceptor caches whole responses by URL and can't invalidate one symbol. Only display reads go through it. It stays on the queue's Redis; a second instance with an eviction policy is the move if it ever grows.

**2026-11-24 — Scheduling and data quality (Phase 4 items 3 and 4).** Decisions the roadmap left open. **Scheduling:** a chain of delayed jobs on the queue, one per session with the session in its id, instead of a cron expression, `@nestjs/schedule`, or BullMQ's repeatable jobs. All three of those fire on a pattern, and the close isn't one: it moves on half days and doesn't happen on holidays. A job per session takes its time from the calendar row, lives in Redis rather than in a process, and can't be added twice. The cost is that the chain must be started and repaired, which is one idempotent call at worker start and at every close. **Settle time:** 30 minutes after the close, for Alpaca's 15-minute delay and the closing auction; later corrections are picked up by the next day's five-day overlap. **Order of work:** the quality check is the parent of the session's refresh jobs in a BullMQ flow, so it runs when they are over rather than after a guessed delay, and still runs when one of them is given up on. **Data quality:** the checks report and store, they don't repair or block: nothing downstream refuses a symbol with a finding. Results are a row per run with counts and a JSON sample, not a row per finding, since the only reader is `/status` and it wants the latest. "Duplicate bars" was defined, since the primary key already prevents the literal case: two bars on one date, or a copy of the previous session's bar. A late check is said as late: the endpoint compares its latest run with the session due. **Deploy:** the worker is a fourth Railway service from the api's image; writing it down showed the deploy guide never listed Redis, `REDIS_URL`, or `JWT_SECRET`, which the api has required in production since Phase 2, so the guide gained them. **Not done:** the worker in `pnpm dev`, a run against Alpaca, the queue's state on `/status` (item 8), and the rename of `market-data/bootstrap/`, which is now the container of every CLI and the worker.

**2026-11-24 — Provider contract and jobs (Phase 4 items 1 and 2).** Phase 3's code is done and its exit waits on the deploy, so Phase 4 started. Decisions the roadmap left open. **Contract:** two methods (bars, corporate actions) in the database's own conventions, so an adapter owns everything provider-specific; the asset list and the calendar stay outside it because only Alpaca has them. Failures are four kinds, and the kind decides whether a job retries. **Yahoo:** a hand-written client instead of `yahoo-finance2` (the Stack row is changed), because the library returns floats; the adapter restores raw prices from split-adjusted ones, which the contract suite's scenario (Apple around its 2020 split) is chosen to catch. Yahoo is used only when asked for, and there is no failover: a series from two sources can't be reproduced. **Jobs:** `bullmq` directly; refreshes are a job per provider batch, cut when they are enqueued, not a parent job that fans out; no job ids for deduplication, since running a job twice writes nothing twice; the worker is a separate process. Backoff and the dead-letter queue are written by hand. **Left for item 3:** what enqueues after the close, and where the worker runs in production. **Fixtures:** the Yahoo one is a recording, the Alpaca one is hand-built (no keys on this machine) and listed under "Next" to be recorded. CI's integration job gained a Redis service.

**2026-11-21 — Forecasting plan, second pass.** A review of [docs/forecasting-plan.md](docs/forecasting-plan.md) for what to add, with most of the candidates left out on purpose: the plan had twelve steps and none built. **Added.** Two charts that need no model join Phase 6's analysis views: a year-over-year comparison and "after a move like this". Phase 8's scorecard step gains the forecast time machine and the Model lab (`/analysis/models`, an analysis view rather than the "Experiments" section the UI plan removed). Step 8 gains VIX from FRED as an input to the volatility model, and step 9 gains the macro calendar beside earnings. **Corrected, inside existing steps:** Yang-Zhang and GJR-GARCH among the volatility models; band calibration that keeps adjusting, each edge on its own, with coverage checked per regime; the "beats naive" test corrected for overlapping horizons, and a check against the best of several variants being best by luck; the direction model trained across all symbols. **Gated:** the ranking across stocks waits for a universe of a few hundred symbols. **Left out**, listed in the plan under "Later, if measured": insider trades, short interest, page views, analyst estimates, per-symbol implied volatility, other markets as features, an analog finder and three more charts, and a pretrained time-series model as a challenger. Phase 8's time box is unchanged; the extensions are still cut before the core. Nothing of it is built.

**2026-11-21 — A dollar amount in the ticket, the ticket in the palette; the forecasting plan.** The two rows Phase 3's UI plan still had open, and a plan change for Phase 8. **Dollar amount.** The 2026-11-18 entry kept the ticket to shares because a dollar amount needs a price the ticket doesn't own; the api owns it, so the api sizes the order. Decisions: the body takes `amount` in place of `quantity` (exactly one of them), not a second endpoint; sizing happens inside `preview`, the one function behind the preview endpoint and the 422, under the portfolio's lock, at the same price the estimate uses, so the two can't disagree; shares are rounded down to a millionth, so the estimate stays within the amount, and the commission is on top (an amount is what goes into shares, not the total spent); the order is stored in shares and fills like any other, with the amount kept beside them (`orders.amount`, migration `order_amount`), which is also what a repeated idempotency key is compared by; an amount that can't be sized is a refusal (`unsized`), not a validation error, since whether there is a price is the books' answer. Known limit, recorded under "Not yet real": an order that waits for the next open was sized at the last close, so it spends a little more or less than asked. **Palette.** One action, "New paper order", which is "Trade NVDA" on a stock page; the drawer is owned by the palette's provider and loads the portfolios through a server action when it opens, rather than the app layout loading them on every page for a command that is rarely used. Checked: api unit and integration tests (an amount sized, replayed, and refused under another amount), the web's unit tests, typecheck, lint, and `next build`. Not checked: the drawer and the palette in a browser. **Forecasting plan.** Phase 8 is rewritten around [docs/forecasting-plan.md](docs/forecasting-plan.md), after the question of whether forecasts from a symbol's own price history are worth anything. They are worth little for direction, so the phase now leads with what is predictable (volatility, then calibrated price ranges), adds a live scorecard of every forecast made, and lists as separate, droppable steps the things that add information: market and sector features, earnings dates, fundamentals, a ranking across stocks, and news. The time box grew from 4–5 to 6–8 weeks. Nothing of Phase 8 is built; its place in the order is unchanged.

**2026-11-20 — The portfolio on Today and the stock page (Phase 3 rows of the UI plan).** Phase 3's item 8 still waits for the host, so the next two rows were the plan's leftovers outside `/portfolios`: Today's portfolio card and market status, and the stock page's fill markers and position summary. Decisions the plan left open. **Market status** is an api endpoint, not arithmetic in the web: the session clock and the exchange calendar live in the api, and a second clock in the web would drift from the one orders meet. It is public like the symbol endpoints (opening hours, nothing of a user's), reports which rule answered (`exchange` or `weekdays`), and its times are shown in New York time as "ET", the same for every viewer, unlike order times, which stay in the viewer's zone. **No new portfolio endpoints:** Today reads each portfolio, its curve, and its orders (open orders are counted from the list), and the stock page reads each portfolio and its orders and filters by symbol. That is three and two requests per portfolio; an endpoint for one symbol's fills joins when a page needs more than a handful. **Markers** carry a letter as well as a color and are placed by session; the fill's price is in the readout as traded, with a note when a later split makes it differ from the adjusted candles. With several portfolios the summary has a section for each and the markers are all of them together. Two small helpers moved to be shared: `cashDirection` (`lib/money.ts`) and `formatCostPerShare` (`lib/format.ts`). Checked against a running api with a throwaway user, a test symbol, and a stored Thanksgiving calendar: the status read `exchange`, the card's equity, day PnL, cash, and open order matched the ledger, the stock page showed 7 shares at 121.00 with the fills counted, and a custom range that ends before the fills dropped the note. The canvas itself was not seen.

**2026-11-19 — Equity curve and day PnL; tracing (Phase 3 item 6, last slice, and item 7).** Phase 3's code is done but for backups, which need the deployed host. Decisions the roadmap left open. **Curve:** nothing is stored, the ledger is replayed per request; a point exists for a day something is known (a close of a symbol the ledger names, or a transaction), not for every calendar session, so the curve needs no exchange calendar and a cash-only stretch is a straight line between two points; day PnL is the change in equity less the owner's cash moves that day, which makes the days add up to the total return; a split or dividend booked late counts from the day of the transaction before it, so days already drawn keep their shape; the endpoint serves the points and the web reads day PnL off the last one, so `/portfolios` asks for each portfolio's curve (one more request per portfolio, fine for a handful). The curve is a `lightweight-charts` area, as ADR 0007 already said for anything with time on the x axis. **Tracing:** built from `sdk-trace`, a context manager, a propagator, and three instrumentations rather than `sdk-node`, the learning-over-shipping rule applied to the SDK's wiring (in production, `sdk-node` or the host's OpenTelemetry integration would replace it); on by default in development only, so tests and the CLIs trace nothing; the Express layer spans are switched off and only the route name kept; `pg` spans exist only inside a request. OpenTelemetry's JS SDK is on its 3.x line, where `sdk-trace` replaces `sdk-trace-base` and `sdk-trace-node`. No ADR: the choices are in the two `tracing.ts` files and this entry. Checked by running the api and the web against a test symbol: the curve's figures, the two pages, and one trace per order from the web's action to the SQL. Not checked: the chart's canvas and the Jaeger UI in a browser.

**2026-11-18 — Orders tab, order ticket, Activity tab (Phase 3 item 6, third and fourth slices).** Orders can be placed in the web app, and every balance can be traced to the ledger lines behind it. Decisions the plan left open: the three tabs are routes that each render a shared header, not a layout, so a portfolio that isn't the user's stays a 404 from the page's own boundary; the ticket takes shares only, because the api's order is in shares and a dollar amount would need a price the ticket doesn't own; "appears optimistically" is a row on the Orders tab while the request is in flight, kept in a module-level store because the ticket and the table are far apart in the tree, and the drawer stays open until the api answers so a refusal can be fixed in place; the timeline's cash column is signed but not colored, since paying for shares isn't a loss; the Activity endpoint is not paged. `LedgerRepository` gained `readRecorded` (the history with each transaction's time and fill) beside `read`, sharing one row mapper. Checked by running the api and the web locally against a test symbol: the three pages and the stock page render the orders, fills, lots, and timeline. Not checked: the ticket's drawer in a browser (no e2e yet).

**2026-11-17 — Portfolio pages; risk rules (Phase 3 item 6, second slice, and item 5).** The first pages over the paper-trading api, and the two things the api still lacked before an order ticket could be honest. Decisions the roadmap left open, recorded in ADR 0009 section 9: the guards at placement work from an estimate (the latest close with slippage, or the limit) and the ledger's check at the fill stays; open buy orders hold their estimated cash and open sell orders free nothing; a refusal is a 422 and leaves no order behind, so `rejected` still means "refused at its fill"; the limit per order is on the notional and is set when the portfolio is created; the preview is the same function as the guard. The calendar is passed to the session clock as a value, and a date it doesn't cover keeps the weekday rule, so a database without it still trades. Item 5's two slices were done together, ahead of the Orders tab, because the ticket needs the preview. On the web, "Portfolio opens the last one you used" became "opens the only one, or the list": nothing remembers a last-used portfolio yet. `apps/web/tsconfig.json` targets ES2020 (was ES2017) for `bigint` literals; it only type-checks, Next compiles separately.

**2026-11-16 — Phase 0 to 3 audit; positions priced; status block restructured.** A review of the whole codebase against this file. Fixed in the api: a deposit or withdrawal was posted without settling the portfolio first, so cash moved today could pay for an order that had met its bar days earlier, or be withdrawn from under one (cash moves now go through `OrdersRepository.transact` like everything else, ADR 0009 section 7); a portfolio whose owner had withdrawn gains answered 500 from then on, because `capital` goes negative and the response schema didn't allow it; a logout sent with a still-valid access token overwrote a `REUSE_DETECTED` revocation; two registrations racing for one email gave a 500; a zero close before a dividend's ex-date divided by zero in every candle query for the symbol; and a response that fails its own schema now logs which fields failed. Fixed in the web: `/stocks/123` showed "the chart couldn't load" instead of a 404, and the manifest sat behind the session gate. Added: the first slice of item 6, positions and equity at the latest close. Plan: the status block became a table and lists (it had grown into three paragraphs nobody could scan), items 5 and 6 of Phase 3 are cut into slices, and what the review found but didn't fix is listed under Phase 3's "Audit follow-ups". The first deploy is named as the next step: three phases are waiting on it.

**2026-11-16 — Phase 0 to 2 refactor, on the same branch.** The follow-ups the audit listed for the first three phases, done. No endpoint or page changed shape; `openapi.json` is the same. **Web:** every server action answers with one `ActionResult` and shares its failure steps (`lib/action-result.ts`: the settings actions had their own, differently shaped); the six browser calls to the BFF's auth routes go through `lib/auth-client.ts`, so a dropped connection is a message instead of the error boundary or nothing; symbol suggestions are one hook (`lib/use-symbol-suggestions.ts`) over an action that reports failure, so a search that can't reach the api no longer reads "nothing matches" in the palette and the add-symbol box; the two localStorage stores share `lib/local-store.ts`; range parsing and its query string are shared by the stock and returns pages; the quote cells of three tables are one `QuoteCells`; a day change has the price's precision (a sub-dollar move no longer reads `+0.00`), the watchlist movers reuse `DayChange`, and the chart's readout formats its prices; the sign-in and registration route handlers validate the body before forwarding it, as does the undo of a removed symbol; and the keyboard reorder keeps focus on the row it moves (to confirm in a browser). The `QueryClientProvider` nothing used is gone with its dependency; the stack table says when TanStack Query comes back. **Api:** `decimalString`, the signed one, and the one-line name live once in `packages/shared/src/primitives.ts`; a ticker is resolved in one place (`symbols/resolve-ticker.ts`), `SymbolsModule` exports its repositories instead of each module providing its own, and a watchlist reorder looks its tickers up in one query instead of one per row; the movers compare on `common/decimal.ts` instead of a second scaled-integer implementation; the Alpaca mapper reads the New York calendar through `market-hours.ts` like settlement does; enum case conversion (`common/enum-case.ts`) and the unique-violation check (`common/prisma-errors.ts`) are shared; refresh-token rotation creates the child token in one place.

**2026-11-16 — The rest of the refactor list, all phases.** What the review had left for later, done on the same branch. **Api:** a ledger has one write path: `LedgerService` and `LedgerRepository.append` are deleted, and the ledger's integration test posts through `OrdersRepository.transact` (ADR 0009 section 7 amended). Repositories raise domain errors that know nothing about HTTP (`common/domain-errors.ts`: `NotFoundError`, `ConflictError`), and the exception filter gives each kind its status, so the per-service `run()` wrappers and try/catch blocks that turned them into `NotFoundException` and `ConflictException` are gone (the convention is in `apps/api/AGENTS.md`). "Sign this device out" and logout are one revocation (`AuthRepository.revokeSession`). `OrdersRepository.snapshot` loads bars, the last bar, and corporate actions through three small methods, ahead of item 5's placement guards. **Web:** drag and keyboard reordering is a hook (`lib/use-reorder.ts`), and `WatchlistItemsTable.tsx` is down from about 400 lines to about 220; the palette's search box and results are `PaletteSearch.tsx`; number formatting is `lib/format.ts`; the range presets and date picker are one `RangeControls` on both pages that have a range; and "the session ended since the page rendered" is one `requireSession` check.

**2026-11-13 — Orders and corporate actions (Phase 3 items 3 and 4).** The first endpoints under `/api/portfolios`, api only: the screens are item 6. Decisions the roadmap left open, recorded in ADR 0009 sections 7 and 8: portfolios settle when read or written until a job exists; an order the ledger refuses at its fill is rejected, and checking at placement stays with the risk rules (item 5); a split cancels the orders placed before it; a dividend is income and a receivable on the ex-date and cash on the pay date, which added two ledger accounts; orders have no time in force. The session clock knows weekends only until the exchange calendar arrives (item 5), recorded under "Not yet real". `corporate_actions` gained `pay_date`; a rerun of the bootstrap fills it for stored dividends.

**2026-11-12 — Phase 3 starts: fill model and ledger (items 1 and 2).** Phase 2 is code-complete and its exit waits on the deployment, so Phase 3 begins with the two items that need neither a deploy nor a page; the gap is recorded in the status block. The fill model is decided (ADR 0008) and built as pure functions with a shared fixture file, ahead of the code that will call it. Two readings of the roadmap's rules were made stricter: a limit order fills only when the bar trades through it, and slippage rounds against the trader. The ledger is double entry (ADR 0009) and derives everything by replay; `fast-check` joins the api's dev dependencies for its property tests. The migration also creates `portfolios`, which item 3 was going to add, because the ledger needs an owner.

**2026-11-12 — Watchlist movers (Phase 2 item 5); two fixes to the audit branch.** The watchlist index shows each list's biggest gain and biggest loss of its latest session, the last open row of the Watchlists plan. A symbol whose last bar is older than the list's newest session is left out, so a delisted symbol's final day isn't a mover forever. Checking the audit fixes found two gaps in them: "Log out everywhere" from an idle tab refreshed the session first, and when the api then failed to revoke, the response dropped the new token pair, so the browser's next request sent a spent refresh token and reuse detection signed the user out; the pair is now set on that response. And sessions recorded the web server's address as the device's, since only the rate limiter read the address the BFF vouches for; sign-in and registration record it too (`clientAddress`).

**2026-11-11 — Phase 2 audit fixes; Today's watchlist summary.** A review of Phase 2 found the api's rate limits written in seconds where the throttler reads milliseconds (so none applied), a sign-out from an idle tab that revoked nothing, and an api restart that signed everyone out; all three are fixed, along with a reorder racing an add, `adjustment=raw` on the returns endpoint, the missing Alpaca timeout, and server actions that lost the api's error messages. Today now shows the user's watchlists and recently viewed stocks, the last open Phase 2 row of the Today plan. A second pass closed what the review had left: rate limits count per browser (the web server vouches for the client address with `BFF_SHARED_SECRET`; before, every user would have shared the web server's bucket once deployed), a pointer drag no longer ends at the first swap downwards, `/forgot-password` is removed until Phase 7, the histogram's bars are one tab stop walked with the arrow keys, the production CSP drops `unsafe-eval`, and prices render with at least two decimals.

**2026-11-10 — User menu, Settings, drag to reorder (Phase 2 item 9; watchlists item 5).** The first endpoints under `/api/me`, and the first Settings pages. "Log out everywhere" moved from an api-only endpoint to a button. The sidebar gains Settings. The watchlist rows lose their up and down arrows for a grip that drags or lifts.

**2026-11-10 — Command palette and keyboard shortcuts (Phase 2 item 8).** The top-bar symbol search became the palette's trigger; `packages/ui` gained two small options for it: `DialogContent` can keep its title for assistive technology only and drop its close button, and `ComboboxInput` can hide its chevron for an `inline` list. The create-watchlist form focuses its name field when opened as `/watchlists#new`, the palette's "New watchlist".

**2026-11-02 — Watchlist pages; auth BFF tidy-up.** The web talks to the api as the user through `lib/api.ts`'s `userApi()`, which puts the session cookie's token on a per-request SDK client (`createApiClient` now takes openapi-fetch options). Writes are server actions in `app/(app)/watchlists/actions.ts`, validated with the shared Zod schemas before they reach the api. While there: the sign-in and registration route handlers share `lib/auth-bff.ts` (they were copies), the cookie pair is set and cleared in one place (`setAuthCookies` / `clearAuthCookies`), the `problemDetail` reader lives beside the client, and `middleware.ts` is `proxy.ts`, the Next 16 name for the same file. `ToastProvider` is mounted at the root for the undo toasts.

**2026-10-19 — Phase 0/1 refactor, second pass.** The web gets `lib/dates.ts`, the twin of the api's `common/dates.ts`: the chart's time stamps, the range presets, and the `?from=&to=` check share its three functions instead of each spelling out `T00:00:00Z`. Today and Stocks render one `NoSymbolsLoaded` state. The symbols service passes the search query through as is, since the repository already treats an empty one as "list all". README's env table says what an unset `ML_URL` means in production.

**2026-10-12 — Phase 0/1 audit.** Checked the code against the status block. One claim wasn't true: `/stocks` never opened an exact ticker or a lone match; it does now. Cleanup: dependencies nothing used are gone (Stripe, `dayjs`, `@tanstack/react-table` in web; `express` 4, `cors`, `ts-node` in the api, whose express 4 pin sat beside Nest 11's express 5), along with the scaffold SVGs in `apps/web/public`. The web makes one SDK client (`lib/api.ts`), the market-data repository no longer imports its date type from the Alpaca client, and api unit-test hooks get 30s, because a Nest testing module could miss the 10s default under a full `turbo run`. Deploy readiness: with `ML_URL` unset in production, `/status` lists ML as not deployed instead of down, so a healthy deploy reads "All services up" (ADR 0005 amended); `robots.txt` disallows everything and is served outside the password gate, and the sitemap is gone until a page is public. Verified locally: the api image migrates a fresh TimescaleDB with `prisma migrate deploy`, passes `/health/ready` with its commit, and refuses to boot in production without `DATABASE_URL` and `CORS_ORIGINS`; the production web build serves the gate, `/status`, and the search redirect.

**2026-10-03 — Prisma everywhere on the Node side.** Prisma is the single database toolkit in `apps/api`: Client, Migrate (including the hand-edited TimescaleDB migrations), TypedSQL for raw queries, and seeding. MongoDB in Phase 4 uses Prisma's MongoDB connector instead of Mongoose. `services/ml` is the one exception, because Prisma has no maintained Python client: it reads Postgres with a plain SQL driver and never owns the schema.

**2026-10-03 — product renamed from Forelume to Veracand.** forelume.com turned out to be an existing paid crypto trading-signals business (TradingView indicators, Discord alerts) with the tagline "Light Before The Move": the same name, the same field, and a concept close to the old "light ahead" logo story. The rename happened before any deployment or domain. "Veracand" (*vera* + *cand(le)*: the true candle) had no `.com`, `.app`, or `.dev` registration and no finance or trading use in a web search on that date; a formal trademark search (USPTO, EUIPO; classes 9, 36, 42) is still to do before Phase 1 deploys. Everything followed: UI copy and metadata, the logo component, the flagship theme id and its storage keys, the local Postgres user and database, the compose project, the ML package (`veracand-ml`), and the docs. The repo name and the `@astraq/*` scope stay. The mark was redrawn to fit the name: a V whose rising arm runs into a candlestick (the true candle), with the gold spark kept as the forecast target. `app/favicon.ico`, until then the Next.js scaffold default, is now generated from the same geometry as `lib/brand-icon.ts`.

**2026-10-03 — first D3 view pulled forward; ADRs renumbered.** The returns distribution moves from Phase 6 to Phase 2, so the creative-visualization goal starts months earlier with a view that needs only stored candles. The chart composition ADR moves with it (now ADR 0007). ADR 0003 went to the pnpm + Turborepo decision in Phase 0, so every later ADR shifts: the contract ADR is now 0004 and the rest follow in order.

**2026-10-02 — design system v2 done.** All 7 plan PRs and the alias follow-up are merged; `@astraq/ui` is versioned `0.2.0`. The token drift check joins the Phase 0 CI item.

**2026-09-24 — full rewrite.** Key changes from the previous plan:

- Deployment moved from Phase 11 to Phase 1; the first phase is now a walking skeleton (provider → database → API → SDK → chart → deployed URL).
- Temporary auth shim removed: the auth core is built once in Phase 2, and peripheral flows move to Phase 7.
- Strategies and backtesting moved ahead of advanced charting, because they complete the core loop.
- One backtest engine (Python) that shares a fill model with paper trading, replacing the earlier TypeScript v1 + Python "advanced" split.
- Scope locked to US equities on daily bars; Alpaca is the primary provider and Yahoo the fallback.
- Finance correctness made explicit: corporate actions, adjusted vs raw prices, trading calendars, decimal money, bias guards.
- MongoDB enters in Phase 4 with an ADR that may remove it; NATS, Celery, and TypeScript backtesting dropped.
- Added time boxes, a definition of done, a no-placeholder-routes rule, an honest status block, and a learning map.
- The completed design-system phase (1.5) is recorded under Completed.
