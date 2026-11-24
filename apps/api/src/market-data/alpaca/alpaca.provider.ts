import type { CandleRow, DateRange } from '../market-data.types';
import type { MarketDataProvider } from '../provider/market-data-provider';
import type { AlpacaClient } from './alpaca.client';
import { toCandleRows, toCorporateActionRows } from './alpaca.mapper';

/**
 * Alpaca behind the provider contract. Little to hide: the bars endpoint
 * serves raw prices when asked (`adjustment=raw`), takes many tickers in
 * one request, and leaves out a ticker it doesn't know.
 */
export class AlpacaProvider implements MarketDataProvider {
  readonly name = 'alpaca';
  /** Well under the URL length either endpoint accepts. */
  readonly batchSize = 100;

  constructor(private readonly client: AlpacaClient) {}

  async *dailyBars(tickers: string[], range: DateRange) {
    for await (const page of this.client.dailyBarPages(tickers, range)) {
      const rows = new Map<string, CandleRow[]>();
      for (const [ticker, bars] of Object.entries(page)) {
        if (bars.length > 0) rows.set(ticker, toCandleRows(bars));
      }
      yield rows;
    }
  }

  async corporateActions(tickers: string[], range: DateRange) {
    return toCorporateActionRows(
      await this.client.corporateActions(tickers, range),
    );
  }
}
