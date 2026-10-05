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

  async search(query: string | undefined): Promise<SymbolList> {
    return { symbols: await this.symbols.search(query || undefined) };
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

    const candles = await this.candles.findDaily(
      symbolId,
      { from: query.from ?? null, to: query.to ?? null },
      query.adjustment,
    );
    return { ticker, adjustment: query.adjustment, candles };
  }
}
