import { Injectable } from '@nestjs/common';
import type {
  Adjustment,
  Candle,
  DailyReturn,
  LatestClose,
  ReturnSeries,
  SparklinePoint,
  Split,
} from '@astraq/shared';
import { toIsoDate, utcMidnight } from '../common/dates';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';

export type CandleRange = {
  /** First session date, YYYY-MM-DD; null for the earliest bar. */
  from: string | null;
  /** Last session date, YYYY-MM-DD; null for the latest bar. */
  to: string | null;
};

/**
 * Reads daily bars, adjusted for corporate actions at query time. Only raw
 * bars are stored, so a newly loaded split or dividend corrects every past
 * bar without rewriting any of them.
 */
@Injectable()
export class CandlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The CTEs every adjusted read starts with, as a fragment `WITH` can
   * embed (`Prisma.sql` renumbers the parameters when fragments nest):
   *
   * 1. `action_ratios`: one row per ex-date with the price multiplier for
   *    bars *before* it. A split from:to multiplies by from/to (NVDA 2024
   *    1:10 -> 0.1). A cash dividend multiplies by 1 - cash / close, the
   *    close being the last raw close before the ex-date (the CRSP / Yahoo
   *    method). A split and a dividend on one day share the row.
   * 2. `cumulative`: a running product from the newest ex-date backwards
   *    (window frame `ORDER BY ex_date DESC ROWS UNBOUNDED PRECEDING`), so
   *    each row holds the product of its own ratio and every later one.
   *    `numeric_product` is our exact aggregate (see its migration).
   *    MATERIALIZED stops Postgres inlining the CTE into the per-bar lookup
   *    below and recomputing it for every bar.
   */
  private adjustmentFactors(symbolId: number): Prisma.Sql {
    return Prisma.sql`
      action_ratios AS (
        SELECT ca.ex_date,
               numeric_product(
                 CASE WHEN ca.type = 'split'
                      THEN ca.split_from / ca.split_to END
               ) AS split_ratio,
               numeric_product(
                 CASE WHEN ca.type = 'dividend'
                      THEN 1 - ca.cash_amount / previous.close END
               ) AS dividend_ratio
        FROM corporate_actions ca
        LEFT JOIN LATERAL (
          SELECT c.close
          FROM candles_daily c
          WHERE c.symbol_id = ca.symbol_id
            AND c.ts < (ca.ex_date::timestamp AT TIME ZONE 'UTC')
          ORDER BY c.ts DESC
          LIMIT 1
        ) previous ON true
        WHERE ca.symbol_id = ${symbolId}::int
        GROUP BY ca.ex_date
      ),
      cumulative AS MATERIALIZED (
        SELECT ex_date,
               numeric_product(split_ratio) OVER later AS split_factor,
               numeric_product(dividend_ratio) OVER later AS dividend_factor
        FROM action_ratios
        WINDOW later AS (ORDER BY ex_date DESC ROWS UNBOUNDED PRECEDING)
      )
    `;
  }

  /**
   * 3. Joins that give each bar `b` its factors as `k`: each bar takes the
   *    factor of the first ex-date after its session. Bars on or after the
   *    last ex-date find none and stay unchanged. Volume is divided by the
   *    split factor only: dividends don't change share counts.
   */
  private factorsForBar(adjustment: Adjustment): Prisma.Sql {
    return Prisma.sql`
      LEFT JOIN LATERAL (
        SELECT f.split_factor, f.dividend_factor
        FROM cumulative f
        WHERE f.ex_date > (b.ts AT TIME ZONE 'UTC')::date
        ORDER BY f.ex_date
        LIMIT 1
      ) f ON true
      CROSS JOIN LATERAL (
        SELECT
          CASE ${adjustment}::text
            WHEN 'raw' THEN 1
            WHEN 'split' THEN coalesce(f.split_factor, 1)
            ELSE coalesce(f.split_factor, 1) * coalesce(f.dividend_factor, 1)
          END AS price,
          CASE ${adjustment}::text
            WHEN 'raw' THEN 1
            ELSE coalesce(f.split_factor, 1)
          END AS volume_divisor
      ) k
    `;
  }

  /** Adjusted bars in the range, oldest first. See `adjustmentFactors`. */
  async findDaily(
    symbolId: number,
    range: CandleRange,
    adjustment: Adjustment,
  ): Promise<Candle[]> {
    return this.prisma.$queryRaw<Candle[]>`
      WITH ${this.adjustmentFactors(symbolId)}
      SELECT to_char(b.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS time,
             trim_scale(round(b.open * k.price, 6))::text AS open,
             trim_scale(round(b.high * k.price, 6))::text AS high,
             trim_scale(round(b.low * k.price, 6))::text AS low,
             trim_scale(round(b.close * k.price, 6))::text AS close,
             round(b.volume / k.volume_divisor)::bigint::text AS volume
      FROM candles_daily b
      ${this.factorsForBar(adjustment)}
      WHERE b.symbol_id = ${symbolId}::int
        AND (${range.from}::date IS NULL
             OR b.ts >= (${range.from}::date::timestamp AT TIME ZONE 'UTC'))
        AND (${range.to}::date IS NULL
             OR b.ts <= (${range.to}::date::timestamp AT TIME ZONE 'UTC'))
      ORDER BY b.ts
    `;
  }

  /**
   * Daily simple returns in the range and their summary, in one query:
   *
   * - `closes`: adjusted closes up to `to`, starting one session *before*
   *   `from` (the `coalesce(max(ts) ...)` subquery), so the first day in the
   *   range has a previous close to compare with.
   * - `returns`: `close / lag(close) OVER (ORDER BY ts) - 1`. `lag` is a
   *   window function: it reads the previous row of the ordered partition
   *   without a self-join. The first row has no previous close and is
   *   dropped along with the extra session when `in_range` applies `from`.
   * - `moments`: count, mean, and both standard deviations. `stddev_samp`
   *   is what the stats report (n - 1); `stddev_pop` is what the skewness
   *   formula needs.
   * - `skewness`: adjusted Fisher-Pearson G1 = sqrt(n(n-1)) / (n-2) * m3 /
   *   sd_pop^3, with m3 the mean cubed deviation. Postgres has no built-in
   *   skewness; `sqrt` of a bigint would go through double precision, so
   *   the count is cast to numeric first to keep the whole thing exact.
   *   Null below three returns or with no spread.
   * - The final SELECT packs the returns as JSON (`json_agg ... ORDER BY`),
   *   so the series and its stats come back in one row from one scan.
   *
   * Every number is rounded to 8 decimals and sent as text, like prices.
   */
  async findDailyReturns(
    symbolId: number,
    range: CandleRange,
    adjustment: Adjustment,
  ): Promise<Pick<ReturnSeries, 'returns' | 'stats'>> {
    type Row = {
      returns: DailyReturn[];
      count: number;
      mean: string | null;
      stdDev: string | null;
      skew: string | null;
      best: DailyReturn | null;
      worst: DailyReturn | null;
      upShare: string | null;
    };
    const from = range.from;
    const [row] = await this.prisma.$queryRaw<[Row]>`
      WITH ${this.adjustmentFactors(symbolId)},
      closes AS (
        SELECT b.ts, b.close * k.price AS close
        FROM candles_daily b
        ${this.factorsForBar(adjustment)}
        WHERE b.symbol_id = ${symbolId}::int
          AND (${range.to}::date IS NULL
               OR b.ts <= (${range.to}::date::timestamp AT TIME ZONE 'UTC'))
          AND (${from}::date IS NULL
               OR b.ts >= coalesce(
                    (SELECT max(c.ts)
                     FROM candles_daily c
                     WHERE c.symbol_id = ${symbolId}::int
                       AND c.ts < (${from}::date::timestamp AT TIME ZONE 'UTC')),
                    (${from}::date::timestamp AT TIME ZONE 'UTC')))
      ),
      returns AS (
        SELECT ts, close / lag(close) OVER (ORDER BY ts) - 1 AS ret
        FROM closes
      ),
      in_range AS (
        SELECT to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, ts, ret
        FROM returns
        WHERE ret IS NOT NULL
          AND (${from}::date IS NULL
               OR ts >= (${from}::date::timestamp AT TIME ZONE 'UTC'))
      ),
      moments AS (
        SELECT count(*) AS n,
               avg(ret) AS mean,
               stddev_samp(ret) AS sd,
               stddev_pop(ret) AS sd_pop,
               count(*) FILTER (WHERE ret > 0) AS up
        FROM in_range
      ),
      skewness AS (
        SELECT CASE WHEN m.n >= 3 AND m.sd_pop > 0 THEN
                 sqrt((m.n * (m.n - 1))::numeric) / (m.n - 2)
                 * (sum(power(r.ret - m.mean, 3)) / m.n)
                 / power(m.sd_pop, 3)
               END AS skew
        FROM in_range r
        CROSS JOIN moments m
        GROUP BY m.n, m.mean, m.sd_pop
      )
      SELECT
        coalesce(
          (SELECT json_agg(
                    json_build_object(
                      'date', date,
                      'return', trim_scale(round(ret, 8))::text)
                    ORDER BY ts)
           FROM in_range),
          '[]'::json) AS returns,
        m.n::int AS count,
        trim_scale(round(m.mean, 8))::text AS mean,
        trim_scale(round(m.sd, 8))::text AS "stdDev",
        (SELECT trim_scale(round(skew, 8))::text FROM skewness) AS skew,
        (SELECT json_build_object(
                  'date', date, 'return', trim_scale(round(ret, 8))::text)
         FROM in_range ORDER BY ret DESC, ts LIMIT 1) AS best,
        (SELECT json_build_object(
                  'date', date, 'return', trim_scale(round(ret, 8))::text)
         FROM in_range ORDER BY ret ASC, ts LIMIT 1) AS worst,
        trim_scale(round(m.up::numeric / nullif(m.n, 0), 8))::text AS "upShare"
      FROM moments m
    `;

    if (row.count === 0) return { returns: [], stats: null };
    return {
      returns: row.returns,
      stats: {
        count: row.count,
        mean: row.mean!,
        stdDev: row.stdDev,
        skew: row.skew,
        best: row.best!,
        worst: row.worst!,
        upShare: row.upShare!,
      },
    };
  }

  /**
   * The latest close and the one before it, per symbol, keyed by symbol id.
   * Symbols without bars are left out.
   *
   * Each LATERAL subquery is an `ORDER BY ts DESC LIMIT 1` on the
   * `(symbol_id, ts)` primary key, so it reads one index entry per symbol
   * however long the history is. The previous close is divided by the
   * splits that went ex after it, up to and including the latest session:
   * NVDA's 1208.88 before its 2024 10:1 split reads as 120.888. An empty
   * `numeric_product` is 1, so no split leaves it unchanged.
   */
  async findLatestCloses(
    symbolIds: number[],
  ): Promise<Map<number, LatestClose>> {
    if (symbolIds.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<
      Array<LatestClose & { symbolId: number }>
    >`
      SELECT s.id AS "symbolId",
             to_char(latest.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
             trim_scale(latest.close)::text AS close,
             trim_scale(round(previous.close * splits.factor, 6))::text
               AS "previousClose"
      FROM symbols s
      CROSS JOIN LATERAL (
        SELECT c.ts, c.close
        FROM candles_daily c
        WHERE c.symbol_id = s.id
        ORDER BY c.ts DESC
        LIMIT 1
      ) latest
      LEFT JOIN LATERAL (
        SELECT c.ts, c.close
        FROM candles_daily c
        WHERE c.symbol_id = s.id AND c.ts < latest.ts
        ORDER BY c.ts DESC
        LIMIT 1
      ) previous ON true
      LEFT JOIN LATERAL (
        SELECT numeric_product(ca.split_from / ca.split_to) AS factor
        FROM corporate_actions ca
        WHERE ca.symbol_id = s.id
          AND ca.type = 'split'
          AND ca.ex_date > (previous.ts AT TIME ZONE 'UTC')::date
          AND ca.ex_date <= (latest.ts AT TIME ZONE 'UTC')::date
      ) splits ON true
      WHERE s.id = ANY(${symbolIds}::int[])
    `;
    return new Map(rows.map(({ symbolId, ...close }) => [symbolId, close]));
  }

  /**
   * The last `sessions` closes per symbol, oldest first, keyed by symbol id:
   * a watchlist row's sparkline. Symbols without bars are left out.
   *
   * Each close is split-adjusted to the latest session's shares, the same
   * basis as `findLatestCloses`, so a split inside the window doesn't draw
   * a cliff. The split factor is the product of the splits that went ex
   * after the bar and no later than the latest bar; without any it's 1.
   */
  async findRecentCloses(
    symbolIds: number[],
    sessions: number,
  ): Promise<Map<number, SparklinePoint[]>> {
    if (symbolIds.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<
      Array<SparklinePoint & { symbolId: number }>
    >`
      SELECT s.id AS "symbolId",
             to_char(bar.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
             trim_scale(round(bar.close * splits.factor, 6))::text AS close
      FROM symbols s
      CROSS JOIN LATERAL (
        SELECT c.ts, c.close
        FROM candles_daily c
        WHERE c.symbol_id = s.id
        ORDER BY c.ts DESC
        LIMIT ${sessions}::int
      ) bar
      CROSS JOIN LATERAL (
        SELECT max(c.ts) AS ts
        FROM candles_daily c
        WHERE c.symbol_id = s.id
      ) latest
      CROSS JOIN LATERAL (
        SELECT numeric_product(ca.split_from / ca.split_to) AS factor
        FROM corporate_actions ca
        WHERE ca.symbol_id = s.id
          AND ca.type = 'split'
          AND ca.ex_date > (bar.ts AT TIME ZONE 'UTC')::date
          AND ca.ex_date <= (latest.ts AT TIME ZONE 'UTC')::date
      ) splits
      WHERE s.id = ANY(${symbolIds}::int[])
      ORDER BY s.id, bar.ts
    `;
    const bySymbol = new Map<number, SparklinePoint[]>();
    for (const { symbolId, ...point } of rows) {
      const points = bySymbol.get(symbolId) ?? [];
      points.push(point);
      bySymbol.set(symbolId, points);
    }
    return bySymbol;
  }

  /** Splits with an ex-date in the range (inclusive), oldest first. */
  async findSplits(symbolId: number, range: CandleRange): Promise<Split[]> {
    const splits = await this.prisma.corporateAction.findMany({
      where: {
        symbolId,
        type: 'SPLIT',
        exDate: {
          ...(range.from && { gte: utcMidnight(range.from) }),
          ...(range.to && { lte: utcMidnight(range.to) }),
        },
      },
      select: { exDate: true, splitFrom: true, splitTo: true },
      orderBy: { exDate: 'asc' },
    });
    // The CHECK constraint guarantees both ratio columns on a split.
    return splits.map((split) => ({
      exDate: toIsoDate(split.exDate),
      from: split.splitFrom!.toString(),
      to: split.splitTo!.toString(),
    }));
  }
}
