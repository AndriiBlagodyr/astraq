import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { AlpacaProvider } from '../alpaca/alpaca.provider';
import type { CandleRow } from '../market-data.types';
import {
  type CapturedExchange,
  captureClock,
  capturing,
  capturingFetch,
} from '../provider/capture';
import { type Fixture, replaying, SCENARIO } from '../provider/fixtures';
import type { MarketDataProvider } from '../provider/market-data-provider';
import { YahooProvider } from '../yahoo/yahoo.provider';
import { toDocument } from './raw-archive';
import { diffRows, flatActions, flatBars, replay } from './replay';

// Capture, then replay: the adapters run once against the contract tests'
// recordings with capturing switched on, and again over what was captured.
// The second run has to read the same rows without the recordings.

const fixture = (name: string): Fixture =>
  JSON.parse(
    readFileSync(join(__dirname, '../provider/fixtures', `${name}.json`), 'utf8'),
  ) as Fixture;

const { ticker, range } = SCENARIO;

/** The adapters as `provider.env.ts` builds them, on recorded answers. */
const adapters: Array<{ name: string; create: () => MarketDataProvider }> = [
  {
    name: 'alpaca',
    create: () =>
      new AlpacaProvider(
        new AlpacaClient(
          {
            ALPACA_API_KEY_ID: 'key',
            ALPACA_API_SECRET_KEY: 'secret',
            ALPACA_DATA_URL: 'https://data.alpaca.markets',
            ALPACA_TRADING_URL: 'https://paper-api.alpaca.markets',
            ALPACA_FEED: 'sip',
          },
          capturingFetch('alpaca', replaying(fixture('alpaca').exchanges)),
          captureClock,
        ),
      ),
  },
  {
    name: 'yahoo',
    create: () => {
      const recorded = fixture('yahoo');
      return new YahooProvider(
        'https://query1.finance.yahoo.com',
        capturingFetch('yahoo', replaying(recorded.exchanges)),
        // The recording's URLs were built at this instant.
        () => new Date(recorded.recordedAt),
      );
    },
  },
];

async function allBars(provider: MarketDataProvider): Promise<CandleRow[]> {
  const rows: CandleRow[] = [];
  for await (const page of provider.dailyBars([ticker], range)) {
    rows.push(...(page.get(ticker) ?? []));
  }
  return rows;
}

describe.each(adapters)('capture and replay: $name', ({ name, create }) => {
  const captured: CapturedExchange[] = [];
  let bars: CandleRow[];

  beforeAll(async () => {
    const provider = create();
    bars = await capturing(
      { operation: 'dailyBars', tickers: [ticker], range },
      (exchange) => captured.push(exchange),
      // The requests are made inside the generator, pages later.
      () => allBars(provider),
    );
  });

  it('captures every answer of the call, in order, with what it answered', () => {
    expect(captured.length).toBeGreaterThan(0);
    expect(captured.map((exchange) => exchange.seq)).toEqual(
      captured.map((_, index) => index),
    );
    expect(new Set(captured.map((exchange) => exchange.captureId)).size).toBe(1);
    expect(captured[0]).toMatchObject({
      provider: name,
      status: 200,
      call: { operation: 'dailyBars', tickers: [ticker], range },
    });
  });

  it('captures nothing outside a capture', async () => {
    const before = captured.length;
    await allBars(create());
    expect(captured).toHaveLength(before);
  });

  it('replays to the same bars, from the stored documents alone', async () => {
    // Through the document and back is what MongoDB does to an exchange.
    const stored = captured.map((exchange) => {
      const document = toDocument(exchange, 90);
      if (document === null) throw new Error('too large');
      return { ...exchange, body: document.response.body };
    });
    // Alpaca's clock was the capture's; Yahoo's was pinned to the recording.
    const clock = name === 'yahoo' ? new Date(fixture('yahoo').recordedAt) : null;
    const replayed = await replay(
      stored.map((exchange) => ({ ...exchange, clock: clock ?? exchange.clock })),
    );
    expect(replayed.bars?.get(ticker)).toEqual(bars);
    expect(bars).toHaveLength(25);
    // Yahoo's two answers hold the actions too; Alpaca's bars page doesn't.
    expect(replayed.actions === null).toBe(name === 'alpaca');
    if (replayed.actions !== null) {
      expect(flatActions(replayed.actions.get(ticker) ?? []).size).toBe(2);
    }
  });
});

describe('diffRows', () => {
  const bar = (date: string, close: string): CandleRow => ({
    ts: new Date(`${date}T00:00:00.000Z`),
    open: '1',
    high: '2',
    low: '0.5',
    close,
    volume: '100',
  });

  it('takes 1.5 and 1.500000 for the same number', () => {
    const diff = diffRows(
      flatBars([bar('2026-11-23', '1.5')]),
      flatBars([{ ...bar('2026-11-23', '1.500000'), open: '1.000000' }]),
    );
    expect(diff).toEqual({ replayed: 1, identical: 1, missing: [], different: [] });
  });

  it('names the field that differs and the row that is not stored', () => {
    const diff = diffRows(
      flatBars([bar('2026-11-23', '1.5'), bar('2026-11-24', '1.6')]),
      flatBars([bar('2026-11-23', '1.51'), bar('2026-11-20', '1.4')]),
    );
    expect(diff.identical).toBe(0);
    expect(diff.missing).toEqual(['2026-11-24']);
    expect(diff.different).toEqual([
      { key: '2026-11-23', field: 'close', replayed: '1.5', stored: '1.51' },
    ]);
  });
});
