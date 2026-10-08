import { Injectable, NotFoundException } from '@nestjs/common';
import type { CandleSeries, CandlesQuery, SymbolList } from '@astraq/shared';
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
    const rows = await this.symbols.search(query || undefined);
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
    const ticker = rawTicker.toUpperCase();
    const symbolId = await this.symbols.findIdByTicker(ticker);
    if (symbolId === null) {
      throw new NotFoundException(`Unknown symbol ${ticker}`);
    }

    const range = { from: query.from ?? null, to: query.to ?? null };
    const [candles, splits] = await Promise.all([
      this.candles.findDaily(symbolId, range, query.adjustment),
      this.candles.findSplits(symbolId, range),
    ]);
    return { ticker, adjustment: query.adjustment, candles, splits };
  }
}
