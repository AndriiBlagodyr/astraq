import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CandleSeries,
  CandlesQuery,
  ReturnSeries,
  ReturnsQuery,
  SymbolList,
} from '@astraq/shared';
import { CandlesRepository } from './candles.repository';
import { SymbolsRepository } from './symbols.repository';

@Injectable()
export class SymbolsService {
  constructor(
    private readonly symbols: SymbolsRepository,
    private readonly candles: CandlesRepository,
  ) {}

  /** Matching symbols, each with its latest close for the day change. */
  async search(query: string | undefined): Promise<SymbolList> {
    const rows = await this.symbols.search(query);
    const closes = await this.candles.findLatestCloses(
      rows.map((row) => row.id),
    );
    return {
      symbols: rows.map(({ id, ...symbol }) => ({
        ...symbol,
        latestClose: closes.get(id) ?? null,
      })),
    };
  }

  /** Daily bars for a ticker (case-insensitive); 404 when it's unknown. */
  async dailyCandles(
    rawTicker: string,
    query: CandlesQuery,
  ): Promise<CandleSeries> {
    const { ticker, symbolId } = await this.resolve(rawTicker);
    const range = { from: query.from ?? null, to: query.to ?? null };
    const [candles, splits] = await Promise.all([
      this.candles.findDaily(symbolId, range, query.adjustment),
      this.candles.findSplits(symbolId, range),
    ]);
    return { ticker, adjustment: query.adjustment, candles, splits };
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

  private async resolve(rawTicker: string) {
    const ticker = rawTicker.toUpperCase();
    const symbolId = await this.symbols.findIdByTicker(ticker);
    if (symbolId === null) {
      throw new NotFoundException(`Unknown symbol ${ticker}`);
    }
    return { ticker, symbolId };
  }
}
