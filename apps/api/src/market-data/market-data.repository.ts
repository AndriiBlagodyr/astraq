import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { DateRange } from './alpaca/alpaca.client';

/** A symbol as the bootstrap seeds it. */
export type SymbolSeed = { ticker: string; name: string; exchange: string };

/** One raw daily bar. Prices and volume are exact decimal strings. */
export type CandleRow = {
  ts: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

/** A split (both ratio sides) or a dividend (cash amount); `exDate` is YYYY-MM-DD. */
export type CorporateActionRow =
  | { type: 'SPLIT'; exDate: string; splitFrom: string; splitTo: string }
  | { type: 'DIVIDEND'; exDate: string; cashAmount: string };

/** Writes provider market data. Every method is idempotent. */
@Injectable()
export class MarketDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Upserts symbols by ticker and returns their ids by ticker. */
  async upsertSymbols(seeds: SymbolSeed[]): Promise<Map<string, number>> {
    const ids = new Map<string, number>();
    for (const seed of seeds) {
      const symbol = await this.prisma.symbol.upsert({
        where: { ticker: seed.ticker },
        create: seed,
        update: { name: seed.name, exchange: seed.exchange },
        select: { id: true },
      });
      ids.set(seed.ticker, symbol.id);
    }
    return ids;
  }

  /**
   * Upserts a batch of bars in one statement: the rows travel as six array
   * parameters that `unnest` turns back into a table, instead of thousands of
   * single-row upserts. The `WHERE ... IS DISTINCT FROM` skips rows that
   * haven't changed, so the returned count is "new or corrected bars" and a
   * second run over the same range reports 0.
   */
  async upsertCandles(symbolId: number, rows: CandleRow[]): Promise<number> {
    if (rows.length === 0) return 0;
    return this.prisma.$executeRaw`
      INSERT INTO candles_daily (symbol_id, ts, open, high, low, close, volume)
      SELECT ${symbolId}::int, t.ts, t.open, t.high, t.low, t.close, t.volume
      FROM unnest(
        ${rows.map((row) => row.ts.toISOString())}::timestamptz[],
        ${rows.map((row) => row.open)}::numeric[],
        ${rows.map((row) => row.high)}::numeric[],
        ${rows.map((row) => row.low)}::numeric[],
        ${rows.map((row) => row.close)}::numeric[],
        ${rows.map((row) => row.volume)}::bigint[]
      ) AS t(ts, open, high, low, close, volume)
      ON CONFLICT (symbol_id, ts) DO UPDATE SET
        open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume
      WHERE (candles_daily.open, candles_daily.high, candles_daily.low,
             candles_daily.close, candles_daily.volume)
        IS DISTINCT FROM
            (EXCLUDED.open, EXCLUDED.high, EXCLUDED.low,
             EXCLUDED.close, EXCLUDED.volume)
    `;
  }

  /**
   * Makes the symbol's actions with an ex-date in `range` exactly `rows`:
   * upserts each on its natural key `(symbol_id, type, ex_date)` and deletes
   * the ones the provider no longer reports. Without the delete, a corrected
   * ex-date would leave the old row behind and adjust older bars twice.
   * One transaction, so a reader never sees the half-replaced set.
   */
  async replaceCorporateActions(
    symbolId: number,
    range: DateRange,
    rows: CorporateActionRow[],
  ): Promise<void> {
    const day = (date: string) => new Date(`${date}T00:00:00.000Z`);
    await this.prisma.$transaction(async (tx) => {
      await tx.corporateAction.deleteMany({
        where: {
          symbolId,
          exDate: { gte: day(range.from), lte: day(range.to) },
          NOT: {
            OR: rows.map((row) => ({ type: row.type, exDate: day(row.exDate) })),
          },
        },
      });
      for (const row of rows) {
        const values =
          row.type === 'SPLIT'
            ? { splitFrom: row.splitFrom, splitTo: row.splitTo, cashAmount: null }
            : { splitFrom: null, splitTo: null, cashAmount: row.cashAmount };
        const exDate = day(row.exDate);
        await tx.corporateAction.upsert({
          where: {
            symbolId_type_exDate: { symbolId, type: row.type, exDate },
          },
          create: { symbolId, type: row.type, exDate, ...values },
          update: values,
        });
      }
    });
  }
}
