import { Injectable } from '@nestjs/common';
import { shiftDays, toIsoDate, utcMidnight } from '../common/dates';
import { PrismaService } from '../database/prisma.service';
import type { MarketSession } from '../trading/market-hours';
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

/** A symbol ingestion keeps fresh, with its last stored session. */
export type TrackedSymbol = { ticker: string; lastBar: string };

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

  /** The ids of the stored symbols among these tickers, by ticker. */
  async findSymbolIds(tickers: string[]): Promise<Map<string, number>> {
    const symbols = await this.prisma.symbol.findMany({
      where: { ticker: { in: tickers } },
      select: { id: true, ticker: true },
      orderBy: { ticker: 'asc' },
    });
    return new Map(symbols.map((symbol) => [symbol.ticker, symbol.id]));
  }

  /**
   * The symbols ingestion keeps fresh: active, with at least one bar stored
   * (watching a symbol or ordering it loads its history, so "has bars" is
   * "someone asked for it"). Each with the date of its last bar, the
   * stalest first. The lateral join reads one index entry per symbol
   * instead of grouping the whole hypertable.
   */
  async findTrackedSymbols(): Promise<TrackedSymbol[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ ticker: string; last_bar: Date }>
    >`
      SELECT s.ticker, latest.ts AS last_bar
      FROM symbols s
      CROSS JOIN LATERAL (
        SELECT c.ts
        FROM candles_daily c
        WHERE c.symbol_id = s.id
        ORDER BY c.ts DESC
        LIMIT 1
      ) latest
      WHERE s.active
      ORDER BY latest.ts, s.ticker
    `;
    return rows.map((row) => ({
      ticker: row.ticker,
      lastBar: toIsoDate(row.last_bar),
    }));
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
   * Recomputes the weekly bars (`candles_weekly`, a continuous aggregate)
   * of the weeks that the sessions `range.from` to `range.to` fall in.
   *
   * The aggregate has its own hourly policy, and serves weeks newer than
   * its last refresh straight from `candles_daily`. Neither helps the
   * reader of a week that was already materialized when its bars changed:
   * a symbol backfilled today has twenty years of weeks the aggregate
   * thinks it knows, and would show none of them for up to an hour. So the
   * writer asks for the refresh itself.
   *
   * The window must be whole buckets (`weekWindow`), or Timescale refuses
   * it as too small. It recomputes only what the invalidation log says
   * changed inside it, for every symbol with bars in those weeks.
   *
   * A procedure that commits as it goes, so it can't run inside a
   * transaction: `$executeRaw` outside `$transaction` sends it alone.
   */
  async refreshWeeklyBars(range: DateRange): Promise<void> {
    const { from, to } = weekWindow(range);
    await this.prisma.$executeRaw`
      CALL refresh_continuous_aggregate(
        'candles_weekly',
        ${from}::date::timestamp AT TIME ZONE 'UTC',
        ${to}::date::timestamp AT TIME ZONE 'UTC'
      )
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
            ? {
                splitFrom: row.splitFrom,
                splitTo: row.splitTo,
                cashAmount: null,
                payDate: null,
              }
            : {
                splitFrom: null,
                splitTo: null,
                cashAmount: row.cashAmount,
                payDate: row.payDate && utcMidnight(row.payDate),
              };
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

  /**
   * Makes the exchange calendar between `range`'s dates exactly `sessions`:
   * one upsert over the whole list (arrays through `unnest`, like the
   * candles), and a delete of the stored days the provider no longer lists,
   * so a newly announced closure removes its session. One transaction.
   * Returns how many sessions are new or changed.
   */
  async replaceMarketSessions(
    range: DateRange,
    sessions: MarketSession[],
  ): Promise<number> {
    const dates = sessions.map((session) => session.date);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM market_sessions
        WHERE date BETWEEN ${range.from}::date AND ${range.to}::date
          AND date <> ALL(${dates}::date[])
      `;
      if (sessions.length === 0) return 0;
      return tx.$executeRaw`
        INSERT INTO market_sessions (date, opens_at, closes_at)
        SELECT t.date, t.opens_at, t.closes_at
        FROM unnest(
          ${dates}::date[],
          ${sessions.map((session) => session.open.toISOString())}::timestamptz[],
          ${sessions.map((session) => session.close.toISOString())}::timestamptz[]
        ) AS t(date, opens_at, closes_at)
        ON CONFLICT (date) DO UPDATE SET
          opens_at = EXCLUDED.opens_at,
          closes_at = EXCLUDED.closes_at
        WHERE (market_sessions.opens_at, market_sessions.closes_at)
          IS DISTINCT FROM (EXCLUDED.opens_at, EXCLUDED.closes_at)
      `;
    });
  }

  /**
   * The stored sessions from `range.from` to `range.to`, oldest first, and
   * the first and last session date stored at all: what the calendar covers.
   */
  async findMarketSessions(range: DateRange): Promise<{
    first: string | null;
    last: string | null;
    sessions: MarketSession[];
  }> {
    const [bounds, sessions] = await Promise.all([
      this.prisma.marketSession.aggregate({
        _min: { date: true },
        _max: { date: true },
      }),
      this.prisma.marketSession.findMany({
        where: {
          date: { gte: utcMidnight(range.from), lte: utcMidnight(range.to) },
        },
        orderBy: { date: 'asc' },
      }),
    ]);
    return {
      first: bounds._min.date && toIsoDate(bounds._min.date),
      last: bounds._max.date && toIsoDate(bounds._max.date),
      sessions: sessions.map((session) => ({
        date: toIsoDate(session.date),
        open: session.opensAt,
        close: session.closesAt,
      })),
    };
  }
}

/**
 * The whole weeks around a range of session dates, as the weekly aggregate
 * buckets them: from the Monday on or before `range.from` to the Monday
 * after `range.to` (the end is exclusive). `time_bucket('1 week')` cuts at
 * Monday 00:00 UTC.
 */
export function weekWindow(range: DateRange): DateRange {
  // getUTCDay counts from Sunday; this counts the days since Monday.
  const sinceMonday = (date: string) =>
    (utcMidnight(date).getUTCDay() + 6) % 7;
  return {
    from: shiftDays(range.from, -sinceMonday(range.from)),
    to: shiftDays(range.to, 7 - sinceMonday(range.to)),
  };
}
