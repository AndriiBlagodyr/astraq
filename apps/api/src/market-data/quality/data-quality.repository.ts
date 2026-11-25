import { Injectable } from '@nestjs/common';
import type { DataQualityCheckName, DataQualityIssue } from '@astraq/shared';
import { toIsoDate, utcMidnight } from '../../common/dates';
import { PrismaService } from '../../database/prisma.service';

/** What one check found: how many in all, and the most recent of them. */
export type CheckFindings = { count: number; issues: DataQualityIssue[] };

/** An issue as it is stored: with the check that found it. */
export type StoredIssue = DataQualityIssue & { check: DataQualityCheckName };

/** One run, as stored. `missingSessions` is null when that check was skipped. */
export type QualityRun = {
  session: string;
  checkedAt: Date;
  symbols: number;
  missingSessions: number | null;
  duplicateBars: number;
  ohlcViolations: number;
  staleSymbols: number;
  issues: StoredIssue[];
};

type FoundRow = {
  ticker: string;
  day: Date;
  detail: string;
  total: bigint;
};

/** Runs are kept this long; `/status` only ever reads the latest. */
const KEEP_DAYS = 90;

const findings = (rows: FoundRow[]): CheckFindings => ({
  // `count(*) OVER ()` puts the whole count on every row, before the LIMIT.
  count: rows.length === 0 ? 0 : Number(rows[0].total),
  issues: rows.map((row) => ({
    ticker: row.ticker,
    session: toIsoDate(row.day),
    detail: row.detail,
  })),
});

/**
 * The data quality checks that are a question to the database (ROADMAP
 * Phase 4 item 4), and the table their results are kept in. Each check
 * reads the bars of the active symbols and returns the newest `limit`
 * findings with the count of all of them.
 */
@Injectable()
export class DataQualityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bars that can't be a day's trading: a low above the open or the close,
   * a high below them, a price of zero or less, a negative volume.
   */
  async findOhlcViolations(limit: number): Promise<CheckFindings> {
    const rows = await this.prisma.$queryRaw<FoundRow[]>`
      SELECT s.ticker,
             (c.ts AT TIME ZONE 'UTC')::date AS day,
             CASE
               WHEN c.low <= 0 THEN 'A price of zero or less'
               WHEN c.volume < 0 THEN 'Negative volume'
               WHEN c.low > LEAST(c.open, c.close)
                 THEN 'Low above the open or the close'
               ELSE 'High below the open or the close'
             END
             || ': open ' || trim_scale(c.open) || ', high ' || trim_scale(c.high)
             || ', low ' || trim_scale(c.low) || ', close ' || trim_scale(c.close)
             || ', volume ' || c.volume AS detail,
             count(*) OVER () AS total
      FROM candles_daily c
      JOIN symbols s ON s.id = c.symbol_id
      WHERE s.active
        AND (c.low > LEAST(c.open, c.close)
          OR c.high < GREATEST(c.open, c.close)
          OR c.low <= 0
          OR c.volume < 0)
      ORDER BY c.ts DESC, s.ticker
      LIMIT ${limit}
    `;
    return findings(rows);
  }

  /**
   * Bars that are there twice, in the two ways the primary key
   * `(symbol_id, ts)` doesn't prevent:
   *
   * - two bars on one session date, which takes a `ts` that isn't the
   *   date's midnight;
   * - a bar that is the previous session's, value for value: a provider
   *   answering for a day it has nothing for with the last bar it has. Two
   *   real sessions don't share a volume to the share. Bars without volume
   *   are left out: a stock that didn't trade repeats honestly.
   */
  async findDuplicateBars(limit: number): Promise<CheckFindings> {
    const rows = await this.prisma.$queryRaw<FoundRow[]>`
      WITH bars AS (
        SELECT c.symbol_id,
               c.ts,
               (c.ts AT TIME ZONE 'UTC')::date AS day,
               count(*) OVER (
                 PARTITION BY c.symbol_id, (c.ts AT TIME ZONE 'UTC')::date
               ) AS same_day,
               c.volume > 0
                 AND c.open = LAG(c.open) OVER sessions
                 AND c.high = LAG(c.high) OVER sessions
                 AND c.low = LAG(c.low) OVER sessions
                 AND c.close = LAG(c.close) OVER sessions
                 AND c.volume = LAG(c.volume) OVER sessions AS repeats
        FROM candles_daily c
        JOIN symbols s ON s.id = c.symbol_id
        WHERE s.active
        WINDOW sessions AS (PARTITION BY c.symbol_id ORDER BY c.ts)
      )
      SELECT s.ticker,
             b.day,
             CASE
               WHEN b.same_day > 1 THEN b.same_day || ' bars on this date'
               ELSE 'The same prices and volume as the session before'
             END AS detail,
             count(*) OVER () AS total
      FROM bars b
      JOIN symbols s ON s.id = b.symbol_id
      WHERE b.same_day > 1 OR b.repeats
      ORDER BY b.ts DESC, s.ticker
      LIMIT ${limit}
    `;
    return findings(rows);
  }

  /**
   * Sessions the exchange held between a symbol's first and last bar that
   * the symbol has no bar for: holes inside a series. (A series that stops
   * early is the stale check's.) Only as far back as the calendar is
   * stored; null when none is, since there is nothing to check against.
   *
   * A stock halted for a whole day has no bar and shows up here. That is
   * rare and true, so it is reported rather than guessed away.
   */
  async findMissingSessions(limit: number): Promise<CheckFindings | null> {
    const stored = await this.prisma.marketSession.count();
    if (stored === 0) return null;
    const rows = await this.prisma.$queryRaw<FoundRow[]>`
      WITH tracked AS (
        SELECT s.id, s.ticker, span.first_day, span.last_day
        FROM symbols s
        CROSS JOIN LATERAL (
          SELECT (min(c.ts) AT TIME ZONE 'UTC')::date AS first_day,
                 (max(c.ts) AT TIME ZONE 'UTC')::date AS last_day
          FROM candles_daily c
          WHERE c.symbol_id = s.id
        ) span
        WHERE s.active AND span.first_day IS NOT NULL
      )
      SELECT t.ticker,
             m.date AS day,
             'No bar for a session the exchange held' AS detail,
             count(*) OVER () AS total
      FROM tracked t
      JOIN market_sessions m ON m.date > t.first_day AND m.date < t.last_day
      WHERE NOT EXISTS (
        SELECT 1
        FROM candles_daily c
        WHERE c.symbol_id = t.id
          AND c.ts = m.date::timestamp AT TIME ZONE 'UTC'
      )
      ORDER BY m.date DESC, t.ticker
      LIMIT ${limit}
    `;
    return findings(rows);
  }

  /** Stores a run and drops the ones older than three months. */
  async saveRun(run: Omit<QualityRun, 'checkedAt'>): Promise<void> {
    const oldest = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60_000);
    await this.prisma.$transaction([
      this.prisma.dataQualityRun.create({
        data: { ...run, session: utcMidnight(run.session) },
      }),
      this.prisma.dataQualityRun.deleteMany({
        where: { checkedAt: { lt: oldest } },
      }),
    ]);
  }

  /** The run checked last, or null before the first. */
  async findLatestRun(): Promise<QualityRun | null> {
    const run = await this.prisma.dataQualityRun.findFirst({
      orderBy: [{ checkedAt: 'desc' }, { id: 'desc' }],
    });
    if (run === null) return null;
    return {
      session: toIsoDate(run.session),
      checkedAt: run.checkedAt,
      symbols: run.symbols,
      missingSessions: run.missingSessions,
      duplicateBars: run.duplicateBars,
      ohlcViolations: run.ohlcViolations,
      staleSymbols: run.staleSymbols,
      // Written by `saveRun` only, in this shape.
      issues: run.issues as StoredIssue[],
    };
  }
}
