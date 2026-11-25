import type { JobsOptions } from 'bullmq';
import { z } from 'zod';
import { shiftDays } from '../../common/dates';
import type { TrackedSymbol } from '../market-data.repository';

// The market data jobs (ROADMAP Phase 4 item 2): their names, payloads, and
// how a refresh is cut into them. Everything here is pure; the queue is in
// `market-data.queue.ts` and the worker in `market-data.worker.ts`.

export const MARKET_DATA_QUEUE = 'market-data';

const ticker = z.string().regex(/^[A-Z][A-Z0-9.-]{0,15}$/);
const range = z.object({
  tickers: z.array(ticker).min(1),
  from: z.iso.date(),
  to: z.iso.date(),
});

/**
 * Each job's payload. A payload is read back from Redis, possibly by a
 * newer build than the one that wrote it, so the worker parses it again.
 *
 * - `symbol-backfill`: one symbol's whole history, bars and actions.
 * - `eod-refresh`: the bars of a batch of tracked symbols over a range that
 *   ends at the session just closed.
 * - `corporate-actions-refresh`: the same batch's splits and dividends,
 *   replaced with what the provider reports now.
 * - `session-close`: a trading day has closed. Schedules the next one's
 *   and enqueues the day's refreshes (`session-scheduler.ts`).
 * - `data-quality-check`: checks the stored bars once the refreshes of
 *   `session` are over (`quality/data-quality.service.ts`).
 */
const session = z.object({ session: z.iso.date() });
export const JOB_SCHEMAS = {
  'symbol-backfill': z.object({ ticker }),
  'eod-refresh': range,
  'corporate-actions-refresh': range,
  'session-close': session,
  'data-quality-check': session,
} as const;

export type JobName = keyof typeof JOB_SCHEMAS;
export type JobData<Name extends JobName = JobName> = z.infer<
  (typeof JOB_SCHEMAS)[Name]
>;

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Every job gets these. Eight attempts with the worker's backoff
 * (`retryDelayMs`) is about an hour of trying, long enough to outlast a
 * provider's bad evening; after that the job is dead-lettered. Finished
 * jobs are kept a week to look at, failed ones a month.
 */
export const JOB_OPTIONS = {
  attempts: 8,
  backoff: { type: 'custom' },
  removeOnComplete: { age: 7 * DAY_SECONDS, count: 1000 },
  removeOnFail: { age: 30 * DAY_SECONDS },
} satisfies JobsOptions;

/**
 * How long after a session's close its refresh runs. The day's bar exists
 * at the close; Alpaca's free plan serves it 15 minutes later, and half an
 * hour leaves room for the closing auction's late prints. A print corrected
 * after that is picked up by the next day's overlap (`BAR_OVERLAP_DAYS`).
 */
export const SETTLE_MS = 30 * 60_000;

/**
 * When the `session-close` job of a session that closes at `close` runs,
 * as a delay from `now`: zero for one that is already due.
 */
export function closeDelayMs(close: Date, now: Date): number {
  return Math.max(0, close.getTime() + SETTLE_MS - now.getTime());
}

/** The id of a session's `session-close` job: one per session, ever. */
export const sessionCloseJobId = (session: string) => `session-close-${session}`;

/** A refresh re-reads this many days before a symbol's last bar. */
export const BAR_OVERLAP_DAYS = 5;
/** How far back a corporate-actions refresh looks for corrections. */
export const ACTION_LOOKBACK_DAYS = 90;

/**
 * Cuts the tracked symbols into one job payload per provider batch.
 *
 * A batch's range starts `lookbackDays` before `to`, or before the last
 * bar of its stalest symbol, whichever is earlier: a symbol that missed
 * a week (the worker was down) gets the week, and nobody keeps a list of
 * gaps. `symbols` arrives stalest first, so the stale ones share a batch
 * instead of widening everyone's range. The overlap re-reads a few stored
 * days, which is what picks up a bar the provider corrected.
 */
export function planRefresh(
  symbols: TrackedSymbol[],
  to: string,
  batchSize: number,
  lookbackDays: number,
): JobData<'eod-refresh'>[] {
  const jobs: JobData<'eod-refresh'>[] = [];
  for (let start = 0; start < symbols.length; start += batchSize) {
    const batch = symbols.slice(start, start + batchSize);
    const stalest = batch.reduce(
      (min, symbol) => (symbol.lastBar < min ? symbol.lastBar : min),
      to,
    );
    jobs.push({
      tickers: batch.map((symbol) => symbol.ticker),
      from: shiftDays(stalest, -lookbackDays),
      to,
    });
  }
  return jobs;
}

const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 30 * 60_000;

/**
 * How long a failed job waits before its next attempt: exponential backoff
 * with jitter, by hand.
 *
 * The wait doubles from 30 seconds and stops growing at 30 minutes. Half
 * of it is random, so the jobs that failed together (a provider outage
 * fails every batch at once) don't all come back in the same second. When
 * the provider named a wait (`Retry-After` on a 429) the job waits at
 * least that long.
 *
 * `attemptsMade` counts the attempts that have failed, so it is 1 the
 * first time this is asked.
 */
export function retryDelayMs(
  attemptsMade: number,
  retryAfterMs: number | null = null,
  random: () => number = Math.random,
): number {
  const ceiling = Math.min(
    MAX_DELAY_MS,
    BASE_DELAY_MS * 2 ** Math.max(0, attemptsMade - 1),
  );
  const jittered = ceiling / 2 + random() * (ceiling / 2);
  return Math.round(Math.max(jittered, retryAfterMs ?? 0));
}
