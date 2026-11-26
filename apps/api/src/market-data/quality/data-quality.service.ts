import { Injectable, Logger } from '@nestjs/common';
import type {
  DataQualityCheck,
  DataQualityCheckName,
  DataQualityReport,
} from '@astraq/shared';
import { lastClosedSession } from '../../trading/market-hours';
import {
  LAST_CLOSE_DAYS_BACK,
  MarketCalendarService,
} from '../market-calendar.service';
import { MarketDataRepository } from '../market-data.repository';
import {
  type CheckFindings,
  DataQualityRepository,
  type QualityRun,
  type StoredIssue,
} from './data-quality.repository';

/** How many of a check's findings are kept and shown; the count is of all. */
export const ISSUE_SAMPLE = 25;

/**
 * How long after a close its check may still be on the way: the half hour
 * the refresh waits, the hour a failing job is retried for, and a margin.
 * Past that, a check that hasn't covered the session is late.
 */
const GRACE_MS = 3 * 60 * 60_000;

const CHECKS = [
  'missing_sessions',
  'duplicate_bars',
  'ohlc_sanity',
  'stale_symbols',
] as const satisfies readonly DataQualityCheckName[];

/** What a run did, as the job's result: a count per check. */
export type QualityRunResult = {
  session: string;
  symbols: number;
  missingSessions: number | 'skipped';
  duplicateBars: number;
  ohlcViolations: number;
  staleSymbols: number;
};

/**
 * Checks the stored daily bars and keeps the result (ROADMAP Phase 4
 * item 4). Four checks, over the active symbols that have bars:
 *
 * - **Missing sessions:** a day the exchange traded, inside a symbol's
 *   series, without a bar.
 * - **Duplicate bars:** a session stored twice, or a bar that is a copy of
 *   the one before it.
 * - **OHLC sanity:** low ≤ open and close ≤ high, prices above zero.
 * - **Stale symbols:** a series that ends before the session just closed.
 *
 * The worker runs it as the last job of each session's refresh, so what it
 * finds is what the refresh left behind; `GET /api/market/data-quality`
 * serves the latest run to `/status`. Nothing is repaired here: a finding
 * is for a person to read. A stale symbol repairs itself at the next
 * refresh if the provider has the bars; the other three mean the provider
 * sent something wrong.
 */
@Injectable()
export class DataQualityService {
  private readonly logger = new Logger(DataQualityService.name);

  constructor(
    private readonly repository: DataQualityRepository,
    private readonly marketData: MarketDataRepository,
    private readonly calendar: MarketCalendarService,
  ) {}

  /** Runs every check against bars expected to reach `session`, and stores it. */
  async run(session: string): Promise<QualityRunResult> {
    const tracked = await this.marketData.findTrackedSymbols();
    // Stalest first, as the repository returns them.
    const stale = tracked.filter((symbol) => symbol.lastBar < session);
    const missing = await this.repository.findMissingSessions(ISSUE_SAMPLE);
    const duplicates = await this.repository.findDuplicateBars(ISSUE_SAMPLE);
    const ohlc = await this.repository.findOhlcViolations(ISSUE_SAMPLE);

    const tagged = (check: DataQualityCheckName, found: CheckFindings | null) =>
      (found?.issues ?? []).map((issue): StoredIssue => ({ check, ...issue }));
    const result: QualityRunResult = {
      session,
      symbols: tracked.length,
      missingSessions: missing?.count ?? 'skipped',
      duplicateBars: duplicates.count,
      ohlcViolations: ohlc.count,
      staleSymbols: stale.length,
    };
    await this.repository.saveRun({
      session,
      symbols: tracked.length,
      missingSessions: missing?.count ?? null,
      duplicateBars: duplicates.count,
      ohlcViolations: ohlc.count,
      staleSymbols: stale.length,
      issues: [
        ...tagged('missing_sessions', missing),
        ...tagged('duplicate_bars', duplicates),
        ...tagged('ohlc_sanity', ohlc),
        ...stale.slice(0, ISSUE_SAMPLE).map(
          (symbol): StoredIssue => ({
            check: 'stale_symbols',
            ticker: symbol.ticker,
            session: null,
            detail: `Last bar ${symbol.lastBar}, expected ${session}`,
          }),
        ),
      ],
    });

    const found =
      (missing?.count ?? 0) + duplicates.count + ohlc.count + stale.length;
    const line = `Data quality for ${session}: ${JSON.stringify(result)}`;
    if (found > 0) this.logger.warn(line);
    else this.logger.log(line);
    return result;
  }

  /** The latest run as `/status` shows it, and whether it is late. */
  async latest(now: Date = new Date()): Promise<DataQualityReport> {
    const due = new Date(now.getTime() - GRACE_MS);
    const expectedSession = lastClosedSession(
      due,
      await this.calendar.around(due, LAST_CLOSE_DAYS_BACK),
    ).date;
    const run = await this.repository.findLatestRun();
    return {
      run: run && {
        session: run.session,
        checkedAt: run.checkedAt.toISOString(),
        symbols: run.symbols,
        checks: CHECKS.map((check) => toCheck(check, run)),
      },
      expectedSession,
      current: run !== null && run.session >= expectedSession,
    };
  }
}

function toCheck(check: DataQualityCheckName, run: QualityRun): DataQualityCheck {
  const count = {
    missing_sessions: run.missingSessions,
    duplicate_bars: run.duplicateBars,
    ohlc_sanity: run.ohlcViolations,
    stale_symbols: run.staleSymbols,
  }[check];
  return {
    check,
    status: count === null ? 'skipped' : count > 0 ? 'failed' : 'passed',
    count: count ?? 0,
    issues: run.issues
      .filter((issue) => issue.check === check)
      .map(({ ticker, session, detail }) => ({ ticker, session, detail })),
  };
}
