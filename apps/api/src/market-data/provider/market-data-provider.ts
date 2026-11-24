import type {
  CandleRow,
  CorporateActionRow,
  DateRange,
} from '../market-data.types';

/**
 * What ingestion needs from a market data source (ROADMAP Phase 4 item 1,
 * ADR 0010). An adapter hides how its provider pages, names tickers, stamps
 * bars, and adjusts prices; everything behind this interface is in the
 * database's own conventions. `provider.contract.spec.ts` runs one suite
 * against every adapter.
 *
 * The contract:
 *
 * - **Bars are raw.** Prices and volume as traded on the day, not adjusted
 *   for any later split or dividend: adjustment happens at read time from
 *   `corporate_actions`. An adapter whose source adjusts must undo it.
 * - **A bar is a session.** `ts` is the session's New York date at 00:00
 *   UTC. Only sessions inside the range (both ends included), one bar per
 *   session, oldest first.
 * - **Numbers are decimal strings** in plain notation, never floats.
 * - **A split is `splitFrom` shares becoming `splitTo`; a dividend is cash
 *   per share as paid**, not adjusted for a later split. `payDate` is null
 *   when the source doesn't say.
 * - **No data is not an error.** A ticker the provider doesn't know, or one
 *   with nothing in the range, is left out of the result.
 * - **Every failure is a `ProviderError`** whose `kind` says whether trying
 *   again can help.
 *
 * The asset list and the exchange calendar are not part of it: only Alpaca
 * has them, and one source of truth for "which days trade" is the point.
 */
export interface MarketDataProvider {
  readonly name: ProviderName;
  /** The most tickers one call should carry; jobs are cut to this size. */
  readonly batchSize: number;

  /** Raw daily bars by ticker, yielded a page at a time. */
  dailyBars(
    tickers: string[],
    range: DateRange,
  ): AsyncIterable<Map<string, CandleRow[]>>;

  /** Splits and cash dividends with an ex-date in the range, by ticker. */
  corporateActions(
    tickers: string[],
    range: DateRange,
  ): Promise<Map<string, CorporateActionRow[]>>;
}

export type ProviderName = 'alpaca' | 'yahoo';

/**
 * How a provider call failed:
 *
 * - `rate_limited`: 429. Try again, after `retryAfterMs` when the provider
 *   named a wait.
 * - `unavailable`: no answer (network, timeout) or a 5xx. Try again.
 * - `rejected`: any other 4xx: bad keys, a plan that doesn't cover the
 *   request, a malformed request. The same call will fail the same way.
 * - `malformed`: an answer that isn't the documented shape. The provider
 *   changed or the adapter is wrong; a retry won't fix either.
 */
export type ProviderFailure =
  | 'rate_limited'
  | 'unavailable'
  | 'rejected'
  | 'malformed';

export class ProviderError extends Error {
  readonly name = 'ProviderError';

  constructor(
    readonly provider: ProviderName,
    readonly kind: ProviderFailure,
    message: string,
    /** The wait the provider asked for, when it did. */
    readonly retryAfterMs: number | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }

  /** Whether the same call can succeed later without anyone changing anything. */
  get retryable(): boolean {
    return this.kind === 'rate_limited' || this.kind === 'unavailable';
  }
}
