import { Injectable, Logger } from '@nestjs/common';
import { AlpacaClient, type DateRange } from '../alpaca/alpaca.client';
import { toCandleRows, toCorporateActionRows } from '../alpaca/alpaca.mapper';
import {
  MarketDataRepository,
  type SymbolSeed,
} from '../market-data.repository';

type TickerSummary = { bars: number; splits: number; dividends: number };

/**
 * Loads raw daily bars and corporate actions for a fixed list of symbols.
 * Synchronous and idempotent: every write is an upsert, so rerunning after a
 * failure (or to pick up new days) is always safe.
 */
@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly alpaca: AlpacaClient,
    private readonly repository: MarketDataRepository,
  ) {}

  async run(symbols: SymbolSeed[], range: DateRange): Promise<void> {
    const tickers = symbols.map((symbol) => symbol.ticker);
    this.logger.log(
      `Bootstrapping ${tickers.length} symbols, ${range.from} to ${range.to}`,
    );

    const ids = await this.repository.upsertSymbols(symbols);
    const summary = new Map<string, TickerSummary>(
      tickers.map((ticker) => [ticker, { bars: 0, splits: 0, dividends: 0 }]),
    );
    const idFor = (ticker: string) => {
      const id = ids.get(ticker);
      if (id === undefined) {
        throw new Error(`Alpaca returned data for unrequested ${ticker}`);
      }
      return id;
    };

    const actions = toCorporateActionRows(
      await this.alpaca.corporateActions(tickers, range),
    );
    for (const [ticker, rows] of actions) {
      await this.repository.upsertCorporateActions(idFor(ticker), rows);
      const counts = summary.get(ticker)!;
      counts.splits += rows.filter((row) => row.type === 'SPLIT').length;
      counts.dividends += rows.filter((row) => row.type === 'DIVIDEND').length;
    }

    for await (const page of this.alpaca.dailyBarPages(tickers, range)) {
      for (const [ticker, bars] of Object.entries(page)) {
        const written = await this.repository.upsertCandles(
          idFor(ticker),
          toCandleRows(bars),
        );
        summary.get(ticker)!.bars += written;
      }
    }

    for (const [ticker, counts] of summary) {
      this.logger.log(
        `${ticker.padEnd(6)} bars new or changed: ${counts.bars}, ` +
          `splits: ${counts.splits}, dividends: ${counts.dividends}`,
      );
    }
  }
}
