import { Injectable } from '@nestjs/common';
import type { Adjustment, Candle, LatestClose, Split } from '@astraq/shared';
import { PrismaService } from '../database/prisma.service';

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
   * How the query works, step by step:
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
   * 3. Each bar takes the factor of the first ex-date after its session.
   *    Bars on or after the last ex-date find none and stay unchanged.
   *    Volume is divided by the split factor only: dividends don't change
   *    share counts.
   */
  async findDaily(
    symbolId: number,
    range: CandleRange,
    adjustment: Adjustment,
  ): Promise<Candle[]> {
    return this.prisma.$queryRaw<Candle[]>`
      WITH action_ratios AS (
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
      SELECT to_char(b.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS time,
             trim_scale(round(b.open * k.price, 6))::text AS open,
             trim_scale(round(b.high * k.price, 6))::text AS high,
             trim_scale(round(b.low * k.price, 6))::text AS low,
             trim_scale(round(b.close * k.price, 6))::text AS close,
             round(b.volume / k.volume_divisor)::bigint::text AS volume
      FROM candles_daily b
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
      WHERE b.symbol_id = ${symbolId}::int
        AND (${range.from}::date IS NULL
             OR b.ts >= (${range.from}::date::timestamp AT TIME ZONE 'UTC'))
        AND (${range.to}::date IS NULL
             OR b.ts <= (${range.to}::date::timestamp AT TIME ZONE 'UTC'))
      ORDER BY b.ts
    `;
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

  /** Splits with an ex-date in the range (inclusive), oldest first. */
  async findSplits(symbolId: number, range: CandleRange): Promise<Split[]> {
    const splits = await this.prisma.corporateAction.findMany({
      where: {
        symbolId,
        type: 'SPLIT',
        exDate: {
          ...(range.from && { gte: new Date(range.from) }),
          ...(range.to && { lte: new Date(range.to) }),
        },
      },
      select: { exDate: true, splitFrom: true, splitTo: true },
      orderBy: { exDate: 'asc' },
    });
    // The CHECK constraint guarantees both ratio columns on a split.
    return splits.map((split) => ({
      exDate: split.exDate.toISOString().slice(0, 10),
      from: split.splitFrom!.toString(),
      to: split.splitTo!.toString(),
    }));
  }
}
