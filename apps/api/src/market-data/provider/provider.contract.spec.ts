import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toIsoDate } from '../../common/dates';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { AlpacaProvider } from '../alpaca/alpaca.provider';
import type { CandleRow, CorporateActionRow } from '../market-data.types';
import { YahooProvider } from '../yahoo/yahoo.provider';
import { type Fixture, replaying, SCENARIO } from './fixtures';
import {
  type MarketDataProvider,
  ProviderError,
} from './market-data-provider';
import type { Fetch } from './provider-http';

// One suite, every adapter (ROADMAP Phase 4 item 1). Each runs against its
// own recorded responses of the same scenario (`fixtures.ts`) and has to
// come out with the same facts: what Apple traded at and paid in August
// 2020 doesn't depend on who is asked.

const fixture = (name: string): Fixture =>
  JSON.parse(
    readFileSync(join(__dirname, 'fixtures', `${name}.json`), 'utf8'),
  ) as Fixture;

const alpaca = fixture('alpaca');
const yahoo = fixture('yahoo');

const adapters: Array<{
  name: string;
  recorded: Fixture;
  create: (fetch: Fetch) => MarketDataProvider;
}> = [
  {
    name: 'alpaca',
    recorded: alpaca,
    create: (fetch) =>
      new AlpacaProvider(
        new AlpacaClient(
          {
            ALPACA_API_KEY_ID: 'key',
            ALPACA_API_SECRET_KEY: 'secret',
            ALPACA_DATA_URL: 'https://data.alpaca.markets',
            ALPACA_TRADING_URL: 'https://paper-api.alpaca.markets',
            ALPACA_FEED: 'sip',
          },
          fetch,
        ),
      ),
  },
  {
    name: 'yahoo',
    recorded: yahoo,
    create: (fetch) =>
      new YahooProvider(
        'https://query1.finance.yahoo.com',
        fetch,
        () => new Date(yahoo.recordedAt),
      ),
  },
];

const { ticker, unknownTicker, range } = SCENARIO;

/** The 25 sessions from 2020-08-03 to 2020-09-04: no holiday falls inside. */
const SESSIONS = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21]
  .map((day) => `2020-08-${String(day).padStart(2, '0')}`)
  .concat(['2020-08-24', '2020-08-25', '2020-08-26', '2020-08-27'])
  .concat(['2020-08-28', '2020-08-31'])
  .concat(['2020-09-01', '2020-09-02', '2020-09-03', '2020-09-04']);

const PLAIN_DECIMAL = /^\d+(\.\d+)?$/;

async function barsOf(
  provider: MarketDataProvider,
  tickers: string[],
): Promise<Map<string, CandleRow[]>> {
  const all = new Map<string, CandleRow[]>();
  for await (const page of provider.dailyBars(tickers, range)) {
    for (const [symbol, rows] of page) {
      all.set(symbol, [...(all.get(symbol) ?? []), ...rows]);
    }
  }
  return all;
}

describe.each(adapters)('provider contract: $name', ({ recorded, create }) => {
  const provider = create(replaying(recorded.exchanges));

  describe('daily bars', () => {
    let bars: CandleRow[];
    beforeAll(async () => {
      bars = (await barsOf(provider, [ticker])).get(ticker) ?? [];
    });
    const on = (date: string) => {
      const bar = bars.find((row) => toIsoDate(row.ts) === date);
      if (bar === undefined) throw new Error(`No bar for ${date}`);
      return bar;
    };

    it('has one bar per session of the range, oldest first, at 00:00 UTC', () => {
      expect(bars.map((bar) => bar.ts.toISOString())).toEqual(
        SESSIONS.map((date) => `${date}T00:00:00.000Z`),
      );
    });

    it('is raw: the split of 2020-08-31 shows in the prices', () => {
      // Apple closed at 499.23 on the Friday and 129.04 on the Monday. An
      // adjusted series reads 124.81 and 129.04.
      expect(Number(on('2020-08-28').close)).toBe(499.23);
      expect(Number(on('2020-08-28').open)).toBe(504.05);
      expect(Number(on('2020-08-31').close)).toBe(129.04);
      // Volume in the shares of the day: about 47 million before the
      // split, not four times that.
      expect(Number(on('2020-08-28').volume)).toBeGreaterThan(40_000_000);
      expect(Number(on('2020-08-28').volume)).toBeLessThan(55_000_000);
    });

    it('has every number as a plain decimal string, the low and high around the rest', () => {
      for (const bar of bars) {
        for (const value of [bar.open, bar.high, bar.low, bar.close]) {
          expect(value).toMatch(PLAIN_DECIMAL);
        }
        expect(bar.volume).toMatch(/^\d+$/);
        const [open, high, low, close] = [
          bar.open,
          bar.high,
          bar.low,
          bar.close,
        ].map(Number);
        expect(low).toBeLessThanOrEqual(Math.min(open, close));
        expect(high).toBeGreaterThanOrEqual(Math.max(open, close));
      }
    });

    it('leaves out a ticker the provider does not know', async () => {
      expect(await barsOf(provider, [unknownTicker])).toEqual(new Map());
    });
  });

  describe('corporate actions', () => {
    let actions: CorporateActionRow[];
    beforeAll(async () => {
      actions =
        (await provider.corporateActions([ticker], range)).get(ticker) ?? [];
    });

    it('reports the split as shares before and after', () => {
      expect(actions.filter((action) => action.type === 'SPLIT')).toEqual([
        { type: 'SPLIT', exDate: '2020-08-31', splitFrom: '1', splitTo: '4' },
      ]);
    });

    it('reports the dividend as paid, not divided by the later split', () => {
      const dividends = actions.filter((action) => action.type === 'DIVIDEND');
      expect(dividends).toHaveLength(1);
      const [dividend] = dividends;
      // 0.82 a share went ex on 2020-08-07; an adjusted source says 0.205.
      expect(dividend).toMatchObject({ exDate: '2020-08-07', cashAmount: '0.82' });
      // A pay date is optional, and never before the ex-date.
      expect(dividend.payDate === null || dividend.payDate >= '2020-08-07').toBe(
        true,
      );
    });

    it('leaves out a ticker the provider does not know', async () => {
      expect(await provider.corporateActions([unknownTicker], range)).toEqual(
        new Map(),
      );
    });
  });

  describe('failures', () => {
    const failing = (response: () => Response | Promise<Response>) =>
      create(async () => response());
    const failure = async (provider: MarketDataProvider) => {
      try {
        await barsOf(provider, [ticker]);
      } catch (error) {
        return error;
      }
      throw new Error('Expected the call to fail');
    };

    it('a 429 is rate_limited, retryable, with the wait the provider named', async () => {
      const error = await failure(
        failing(
          () =>
            new Response('slow down', {
              status: 429,
              headers: { 'retry-after': '7' },
            }),
        ),
      );
      expect(error).toBeInstanceOf(ProviderError);
      expect(error).toMatchObject({
        kind: 'rate_limited',
        retryable: true,
        retryAfterMs: 7000,
      });
    });

    it('a 5xx or no answer is unavailable, retryable', async () => {
      const down = await failure(
        failing(() => new Response('bad gateway', { status: 502 })),
      );
      expect(down).toMatchObject({ kind: 'unavailable', retryable: true });

      const unreachable = await failure(
        failing(() => Promise.reject(new TypeError('fetch failed'))),
      );
      expect(unreachable).toBeInstanceOf(ProviderError);
      expect(unreachable).toMatchObject({ kind: 'unavailable', retryable: true });
    });

    it('any other 4xx is rejected, not retryable', async () => {
      const error = await failure(
        failing(() => new Response('forbidden', { status: 403 })),
      );
      expect(error).toMatchObject({ kind: 'rejected', retryable: false });
    });

    it('an answer in another shape is malformed, not retryable', async () => {
      const html = await failure(
        failing(() => new Response('<html>Maintenance</html>', { status: 200 })),
      );
      expect(html).toMatchObject({ kind: 'malformed', retryable: false });

      const json = await failure(
        failing(() => new Response('{"unexpected":true}', { status: 200 })),
      );
      expect(json).toMatchObject({ kind: 'malformed', retryable: false });
    });
  });
});

describe('provider contract: across adapters', () => {
  it('every adapter reads the same closes out of its own recording', async () => {
    const closes = await Promise.all(
      adapters.map(async ({ recorded, create }) => {
        const bars = await barsOf(create(replaying(recorded.exchanges)), [
          ticker,
        ]);
        return (bars.get(ticker) ?? []).map(
          (bar) => `${toIsoDate(bar.ts)} ${Number(bar.close)}`,
        );
      }),
    );
    expect(closes[0]).toHaveLength(SESSIONS.length);
    for (const other of closes.slice(1)) expect(other).toEqual(closes[0]);
  });
});
