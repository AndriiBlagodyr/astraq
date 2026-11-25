import { Injectable } from '@nestjs/common';
import type {
  CandleSeries,
  CandlesQuery,
  LatestClose,
  ReturnSeries,
  ReturnsQuery,
  SymbolList,
} from '@astraq/shared';
import { MarketDataCache } from '../market-data/cache/market-data-cache';
import { CandlesRepository } from './candles.repository';
import { resolveTicker } from './resolve-ticker';
import { SymbolsRepository } from './symbols.repository';

@Injectable()
export class SymbolsService {
  constructor(
    private readonly symbols: SymbolsRepository,
    private readonly candles: CandlesRepository,
    private readonly cache: MarketDataCache,
  ) {}

  /**
   * Matching symbols, each with its latest close for the day change. Both
   * halves come through the cache, separately: the rows change when the
   * symbol list does, the closes once a day.
   */
  async search(query: string | undefined): Promise<SymbolList> {
    const rows = await this.cache.search(query, () =>
      this.symbols.search(query),
    );
    const closes = await this.latestCloses(rows.map((row) => row.id));
    return {
      symbols: rows.map(({ id, ...symbol }) => ({
        ...symbol,
        latestClose: closes.get(id) ?? null,
      })),
    };
  }

  /**
   * Daily or weekly bars for a ticker (case-insensitive); 404 when it's
   * unknown.
   */
  async dailyCandles(
    rawTicker: string,
    query: CandlesQuery,
  ): Promise<CandleSeries> {
    const { ticker, symbolId } = await this.resolve(rawTicker);
    const range = { from: query.from ?? null, to: query.to ?? null };
    const [candles, splits] = await Promise.all([
      query.interval === '1w'
        ? this.candles.findWeekly(symbolId, range, query.adjustment)
        : this.candles.findDaily(symbolId, range, query.adjustment),
      this.candles.findSplits(symbolId, range),
    ]);
    return {
      ticker,
      adjustment: query.adjustment,
      interval: query.interval,
      candles,
      splits,
    };
  }

  /** Daily returns and their statistics for a ticker; 404 when it's unknown. */
  async dailyReturns(
    rawTicker: string,
    query: ReturnsQuery,
  ): Promise<ReturnSeries> {
    const { ticker, symbolId } = await this.resolve(rawTicker);
    const range = { from: query.from ?? null, to: query.to ?? null };
    const series = await this.candles.findDailyReturns(
      symbolId,
      range,
      query.adjustment,
    );
    return { ticker, adjustment: query.adjustment, ...series };
  }

  /**
   * The latest close per symbol id, from the cache where it has one. For
   * display (search results, watchlist rows); trading reads the database.
   */
  latestCloses(symbolIds: number[]): Promise<Map<number, LatestClose>> {
    return this.cache.latestCloses(symbolIds, (missing) =>
      this.candles.findLatestCloses(missing),
    );
  }

  private resolve(rawTicker: string) {
    return resolveTicker(this.symbols, rawTicker);
  }
}
