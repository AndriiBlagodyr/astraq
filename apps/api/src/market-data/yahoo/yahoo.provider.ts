import { shiftDays, toIsoDate, utcMidnight } from '../../common/dates';
import type {
  CandleRow,
  CorporateActionRow,
  DateRange,
} from '../market-data.types';
import {
  type MarketDataProvider,
  ProviderError,
} from '../provider/market-data-provider';
import { type Fetch, providerGet } from '../provider/provider-http';
import { toSplitFactors, toYahooSeries } from './yahoo.mapper';
import { type YahooChartResult, yahooChartSchema } from './yahoo.schemas';

/** Midnight UTC of a date, in the unix seconds Yahoo's periods take. */
const seconds = (date: string) => String(utcMidnight(date).getTime() / 1000);

/**
 * Yahoo Finance's chart endpoint behind the provider contract: the keyless
 * fallback (ROADMAP Stack). Written by hand like the Alpaca client, not
 * with `yahoo-finance2`: it is one endpoint, and the library hands prices
 * over as JavaScript floats.
 *
 * What it hides (see `toYahooSeries`): one ticker per request, prices that
 * are adjusted for splits and stored as 32-bit floats, class shares spelled
 * with a dash (BRK-B), and a 404 for a ticker it doesn't know. The endpoint
 * is undocumented and can change or refuse without notice, which is why it
 * is never the default (`provider.env.ts`).
 */
export class YahooProvider implements MarketDataProvider {
  readonly name = 'yahoo';
  readonly batchSize = 1;

  constructor(
    private readonly baseUrl: string,
    private readonly fetch: Fetch = globalThis.fetch,
    /** Injected so a recorded exchange replays with the URL it was made with. */
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * The last series asked for. A backfill asks for a ticker's bars and then
   * its actions over one range; both come from the same two responses.
   */
  private last: {
    key: string;
    series: ReturnType<YahooProvider['load']>;
  } | null = null;

  async *dailyBars(tickers: string[], range: DateRange) {
    for (const ticker of tickers) {
      const { candles } = await this.series(ticker, range);
      if (candles.length > 0) {
        yield new Map<string, CandleRow[]>([[ticker, candles]]);
      }
    }
  }

  async corporateActions(tickers: string[], range: DateRange) {
    const byTicker = new Map<string, CorporateActionRow[]>();
    for (const ticker of tickers) {
      const { actions } = await this.series(ticker, range);
      if (actions.length > 0) byTicker.set(ticker, actions);
    }
    return byTicker;
  }

  /**
   * Two requests: the range's bars with their dividends and splits, and
   * the splits since the range, which the first response's prices are
   * already divided by but doesn't list. The second asks for quarterly
   * bars, the coarsest there are, since only its events are read.
   */
  private series(ticker: string, range: DateRange) {
    const key = `${ticker}|${range.from}|${range.to}`;
    if (this.last?.key !== key) {
      const series = this.load(ticker, range);
      this.last = { key, series };
      // A failure isn't kept: the retry asks again.
      series.catch(() => {
        if (this.last?.series === series) this.last = null;
      });
    }
    return this.last.series;
  }

  private async load(ticker: string, range: DateRange) {
    const empty = { candles: [], actions: [] };
    const after = shiftDays(range.to, 1);
    const tomorrow = shiftDays(toIsoDate(this.now()), 1);

    const result = await this.chart(ticker, {
      period1: seconds(range.from),
      // Exclusive, and a bar is stamped at its session's open.
      period2: seconds(after),
      interval: '1d',
      events: 'div,splits',
    });
    if (result === null) return empty;

    const later =
      after < tomorrow
        ? await this.chart(ticker, {
            period1: seconds(after),
            period2: seconds(tomorrow),
            interval: '3mo',
            events: 'splits',
          })
        : null;

    const splits = toSplitFactors([
      ...Object.values(result.events.splits),
      ...Object.values(later?.events.splits ?? {}),
    ]);
    // A split on the boundary can be in both responses.
    const once = [...new Map(splits.map((s) => [s.exDate, s])).values()];
    return toYahooSeries(result, once, range);
  }

  /** One chart request; null for a ticker Yahoo doesn't know. */
  private async chart(
    ticker: string,
    params: Record<string, string>,
  ): Promise<YahooChartResult | null> {
    const symbol = ticker.replaceAll('.', '-');
    const url = new URL(
      `/v8/finance/chart/${encodeURIComponent(symbol)}`,
      this.baseUrl,
    );
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const data = await providerGet({
      provider: 'yahoo',
      fetch: this.fetch,
      url,
      // Without a browser's user agent the endpoint answers 429 to everyone.
      headers: { 'user-agent': 'Mozilla/5.0' },
      schema: yahooChartSchema,
    });
    if (data === null) return null;
    if (data.chart.error !== null || data.chart.result === null) {
      throw new ProviderError(
        'yahoo',
        'malformed',
        `yahoo ${url.pathname} answered 200 with an error: ` +
          (data.chart.error?.description ?? data.chart.error?.code ?? 'no result'),
      );
    }
    return data.chart.result[0] ?? null;
  }
}
