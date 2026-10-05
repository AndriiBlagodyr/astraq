import type { z } from 'zod/v4';
import type { AlpacaEnv } from './alpaca.env';
import {
  type AlpacaBarsPage,
  type AlpacaCorporateActions,
  alpacaBarsPageSchema,
  alpacaCorporateActionsPageSchema,
} from './alpaca.schemas';
import { parseJsonExact } from './exact-json';

/** A closed range of session dates, `YYYY-MM-DD`. */
export type DateRange = { from: string; to: string };

/**
 * A minimal, hand-written client for the two Alpaca market data endpoints the
 * bootstrap needs. No retries or rate limiting on purpose: the bootstrap is
 * idempotent, so a failed run is simply run again (ROADMAP Phase 1).
 */
export class AlpacaClient {
  constructor(private readonly config: AlpacaEnv) {}

  /** Raw (unadjusted) daily bars, yielded one page at a time. */
  async *dailyBarPages(
    symbols: string[],
    range: DateRange,
  ): AsyncGenerator<AlpacaBarsPage['bars']> {
    let pageToken: string | null = null;
    do {
      const page: AlpacaBarsPage = await this.get(
        '/v2/stocks/bars',
        {
          symbols: symbols.join(','),
          timeframe: '1Day',
          start: range.from,
          end: range.to,
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
    path: string,
    params: Record<string, string | null>,
    schema: Schema,
  ): Promise<z.infer<Schema>> {
    const url = new URL(path, this.config.ALPACA_DATA_URL);
    for (const [key, value] of Object.entries(params)) {
      if (value !== null) url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': this.config.ALPACA_API_KEY_ID,
        'APCA-API-SECRET-KEY': this.config.ALPACA_API_SECRET_KEY,
        accept: 'application/json',
      },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(
        `Alpaca ${path} failed with ${response.status}: ${body.slice(0, 500)}`,
      );
    }
    return schema.parse(parseJsonExact(body));
  }
}
