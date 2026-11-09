import { Injectable } from '@nestjs/common';
import { utcMidnight } from '../common/dates';
import { PrismaService } from '../database/prisma.service';
import type {
  CandleRow,
  CorporateActionRow,
  DateRange,
  SymbolSeed,
} from './market-data.types';

/** What a symbol universe sync changed. */
export type SymbolSyncSummary = {
  inserted: number;
  updated: number;
  deactivated: number;
};

/** Writes provider market data. Every method is idempotent. */
@Injectable()
export class MarketDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Makes the active symbols exactly `seeds`, in one transaction:
   *
   * 1. One `INSERT ... ON CONFLICT (ticker) DO UPDATE` over the whole list,
   *    with the rows travelling as three array parameters through `unnest`
   *    (the same trick as `upsertCandles`), so ~11,000 symbols are one
   *    round trip instead of 11,000. The `WHERE ... IS DISTINCT FROM` skips
   *    rows that haven't changed, so a second run reports 0 updates.
   *    `xmax = 0` tells an inserted row from an updated one: a fresh tuple
   *    has no deleting transaction id, an updated one carries the id of the
   *    transaction that replaced its old version.
   * 2. Every other active symbol is deactivated: it keeps its candles and
   *    watchlist rows (a delisted stock is still history), but leaves
   *    search and ingestion. Rerunning after a relisting reactivates it.
   */
  async syncSymbols(seeds: SymbolSeed[]): Promise<SymbolSyncSummary> {
    if (seeds.length === 0) {
      throw new Error('Refusing to sync an empty symbol list');
    }
    const tickers = seeds.map((seed) => seed.ticker);
    return this.prisma.$transaction(async (tx) => {
      const [upserted] = await tx.$queryRaw<
        Array<{ inserted: bigint; updated: bigint }>
      >`
        WITH upserted AS (
          INSERT INTO symbols (ticker, name, exchange, active, updated_at)
          SELECT t.ticker, t.name, t.exchange, true, now()
          FROM unnest(
            ${tickers}::text[],
            ${seeds.map((seed) => seed.name)}::text[],
            ${seeds.map((seed) => seed.exchange)}::text[]
          ) AS t(ticker, name, exchange)
          ON CONFLICT (ticker) DO UPDATE SET
            name = EXCLUDED.name,
            exchange = EXCLUDED.exchange,
            active = true,
            updated_at = now()
          WHERE (symbols.name, symbols.exchange, symbols.active)
            IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.exchange, true)
          RETURNING (xmax = 0) AS inserted
        )
        SELECT count(*) FILTER (WHERE inserted) AS inserted,
               count(*) FILTER (WHERE NOT inserted) AS updated
        FROM upserted
      `;
      const deactivated = await tx.$executeRaw`
        UPDATE symbols
        SET active = false, updated_at = now()
        WHERE active AND ticker <> ALL(${tickers}::text[])
      `;
      return {
        inserted: Number(upserted.inserted),
        updated: Number(upserted.updated),
        deactivated,
      };
    });
  }

  /** The stored symbols for these tickers, as bootstrap seeds. */
  async findSeeds(tickers: string[]): Promise<SymbolSeed[]> {
    return this.prisma.symbol.findMany({
      where: { ticker: { in: tickers } },
      select: { ticker: true, name: true, exchange: true },
      orderBy: { ticker: 'asc' },
    });
  }

  /** One stored symbol as a bootstrap seed, or null. */
  async findSeed(symbolId: number): Promise<SymbolSeed | null> {
    return this.prisma.symbol.findUnique({
      where: { id: symbolId },
      select: { ticker: true, name: true, exchange: true },
    });
  }

  /** Whether at least one daily bar is stored for the symbol. */
  async hasCandles(symbolId: number): Promise<boolean> {
    const bar = await this.prisma.candleDaily.findFirst({
      where: { symbolId },
      select: { symbolId: true },
    });
    return bar !== null;
  }

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
    await this.prisma.$transaction(async (tx) => {
      await tx.corporateAction.deleteMany({
        where: {
          symbolId,
          exDate: { gte: utcMidnight(range.from), lte: utcMidnight(range.to) },
          NOT: {
            OR: rows.map((row) => ({
              type: row.type,
              exDate: utcMidnight(row.exDate),
            })),
          },
        },
      });
      for (const row of rows) {
        const values =
          row.type === 'SPLIT'
            ? { splitFrom: row.splitFrom, splitTo: row.splitTo, cashAmount: null }
            : { splitFrom: null, splitTo: null, cashAmount: row.cashAmount };
        const exDate = utcMidnight(row.exDate);
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
