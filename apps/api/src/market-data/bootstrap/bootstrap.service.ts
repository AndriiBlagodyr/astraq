import { Injectable, Logger } from '@nestjs/common';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { toCandleRows, toCorporateActionRows } from '../alpaca/alpaca.mapper';
import { MarketDataRepository } from '../market-data.repository';
import type { DateRange, SymbolSeed } from '../market-data.types';

type TickerSummary = { bars: number; splits: number; dividends: number };

/**
 * Loads raw daily bars and corporate actions for a fixed list of symbols.
 * Sequential (no queue) and idempotent: bars are upserted and each symbol's
 * actions in the range are replaced with what the provider reports now, so
 * rerunning after a failure, or to pick up new days and corrections, is safe.
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

    // Each requested ticker's row id and running counts, so a ticker the
    // provider returns unasked is caught before anything is written for it.
    const requested = new Map<string, { id: number; counts: TickerSummary }>();
    for (const [ticker, id] of await this.repository.upsertSymbols(symbols)) {
      requested.set(ticker, {
        id,
        counts: { bars: 0, splits: 0, dividends: 0 },
      });
    }
    const symbolFor = (ticker: string) => {
      const entry = requested.get(ticker);
      if (entry === undefined) {
        throw new Error(`Alpaca returned data for unrequested ${ticker}`);
      }
      return entry;
    };

    const actions = toCorporateActionRows(
      await this.alpaca.corporateActions(tickers, range),
    );
    // Every requested ticker, not just those with actions: a symbol whose
    // only action was withdrawn upstream still needs the stale row removed.
    for (const [ticker, { id, counts }] of requested) {
      const rows = actions.get(ticker) ?? [];
      await this.repository.replaceCorporateActions(id, range, rows);
      counts.splits += rows.filter((row) => row.type === 'SPLIT').length;
      counts.dividends += rows.filter((row) => row.type === 'DIVIDEND').length;
    }

    for await (const page of this.alpaca.dailyBarPages(tickers, range)) {
      for (const [ticker, bars] of Object.entries(page)) {
        const { id, counts } = symbolFor(ticker);
        counts.bars += await this.repository.upsertCandles(
          id,
          toCandleRows(bars),
        );
      }
    }

    for (const [ticker, { counts }] of requested) {
      this.logger.log(
        `${ticker.padEnd(6)} bars new or changed: ${counts.bars}, ` +
          `splits: ${counts.splits}, dividends: ${counts.dividends}`,
      );
    }
  }
}
