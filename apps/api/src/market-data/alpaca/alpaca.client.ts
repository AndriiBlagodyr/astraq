import type { z } from 'zod';
import type { DateRange } from '../market-data.types';
import type { AlpacaEnv } from './alpaca.env';
import {
  type AlpacaAsset,
  type AlpacaBarsPage,
  type AlpacaCalendarDay,
  type AlpacaCorporateActions,
  alpacaAssetsSchema,
  alpacaBarsPageSchema,
  alpacaCalendarSchema,
  alpacaCorporateActionsPageSchema,
} from './alpaca.schemas';
import { ProviderError } from '../provider/market-data-provider';
import { type Fetch, providerGet } from '../provider/provider-http';

/**
 * A minimal, hand-written client for the four Alpaca endpoints the market
 * data loaders need: bars and corporate actions from the data API, the asset
 * list and the exchange calendar from the trading API. No retries or rate
 * limiting here: a failure is a `ProviderError` that says whether trying
 * again can help, every loader is idempotent, and the retrying is the job
 * queue's (ROADMAP Phase 4 item 2).
 */
export class AlpacaClient {
  constructor(
    private readonly config: AlpacaEnv,
    private readonly fetch: Fetch = globalThis.fetch,
  ) {}

  /**
   * Every active US equity Alpaca knows, in one response (about 11,000
   * rows; the endpoint has no paging). Inactive assets are left out so a
   * delisting shows up as a ticker missing from the list.
   */
  async activeUsEquities(): Promise<AlpacaAsset[]> {
    return this.get(
      this.config.ALPACA_TRADING_URL,
      '/v2/assets',
      { status: 'active', asset_class: 'us_equity' },
      alpacaAssetsSchema,
    );
  }

  /**
   * The trading days in the range, each with its open and close in New
   * York time. One response: the endpoint has no paging.
   */
  async calendar(range: DateRange): Promise<AlpacaCalendarDay[]> {
    return this.get(
      this.config.ALPACA_TRADING_URL,
      '/v2/calendar',
      { start: range.from, end: range.to },
      alpacaCalendarSchema,
    );
  }

  /** Raw (unadjusted) daily bars, yielded one page at a time. */
  async *dailyBarPages(
    symbols: string[],
    range: DateRange,
  ): AsyncGenerator<AlpacaBarsPage['bars']> {
    let pageToken: string | null = null;
    do {
      const page: AlpacaBarsPage = await this.get(
        this.config.ALPACA_DATA_URL,
        '/v2/stocks/bars',
        {
          symbols: symbols.join(','),
          timeframe: '1Day',
          start: range.from,
          // End of the day, not its midnight: daily bars are stamped at
          // 00:00 New York time (04:00/05:00 UTC), so a date-only end could
          // drop the bar for `to` itself.
          end: `${range.to}T23:59:59Z`,
          adjustment: 'raw',
          feed: this.config.ALPACA_FEED,
          limit: '10000',
          page_token: pageToken,
        },
        alpacaBarsPageSchema,
      );
      yield page.bars;
      pageToken = page.next_page_token;
    } while (pageToken);
  }

  /** Splits and cash dividends with an ex-date in the range, all pages merged. */
  async corporateActions(
    symbols: string[],
    range: DateRange,
  ): Promise<AlpacaCorporateActions> {
    const merged: AlpacaCorporateActions = {
      forward_splits: [],
      reverse_splits: [],
      cash_dividends: [],
    };
    let pageToken: string | null = null;
    do {
      const page: z.infer<typeof alpacaCorporateActionsPageSchema> =
        await this.get(
          this.config.ALPACA_DATA_URL,
          '/v1/corporate-actions',
          {
            symbols: symbols.join(','),
            types: 'forward_split,reverse_split,cash_dividend',
            start: range.from,
            end: range.to,
            limit: '1000',
            page_token: pageToken,
          },
          alpacaCorporateActionsPageSchema,
        );
      const actions = page.corporate_actions;
      merged.forward_splits.push(...actions.forward_splits);
      merged.reverse_splits.push(...actions.reverse_splits);
      merged.cash_dividends.push(...actions.cash_dividends);
      pageToken = page.next_page_token;
    } while (pageToken);
    return merged;
  }

  private async get<Schema extends z.ZodType>(
    base: string,
    path: string,
    params: Record<string, string | null>,
    schema: Schema,
  ): Promise<z.infer<Schema>> {
    const url = new URL(path, base);
    for (const [key, value] of Object.entries(params)) {
      if (value !== null) url.searchParams.set(key, value);
    }
    const data = await providerGet({
      provider: 'alpaca',
      fetch: this.fetch,
      url,
      headers: {
        'APCA-API-KEY-ID': this.config.ALPACA_API_KEY_ID,
        'APCA-API-SECRET-KEY': this.config.ALPACA_API_SECRET_KEY,
      },
      schema,
    });
    // None of these endpoints answers 404 for a ticker it doesn't know (it
    // leaves the ticker out), so a 404 here is a wrong host or path.
    if (data === null) {
      throw new ProviderError('alpaca', 'rejected', `alpaca ${path} is not there (404)`);
    }
    return data;
  }
}
