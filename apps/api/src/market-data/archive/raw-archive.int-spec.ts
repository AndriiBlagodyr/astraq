import { MongoClient } from 'mongodb';
import { capturingFetch } from '../provider/capture';
import type { Fetch } from '../provider/provider-http';
import { MongoRawArchive } from './raw-archive';

// The archive against a real MongoDB (`pnpm infra:up`; CI starts one). A
// database of its own, so a run never touches what a developer archived.
const URL =
  process.env.MONGODB_TEST_URL ?? 'mongodb://localhost:27017/veracand_test';

// A ticker with a dot is a field name with a dot once the body is stored as
// a document, which MongoDB took as a path until version 5.
const BODY = '{"bars":{"BRK.B":[{"c":412.105,"v":3100000}]},"next_page_token":null}';

const answering =
  (status: number, body: string): Fetch =>
  async () =>
    new Response(body, { status });

describe('MongoRawArchive', () => {
  const archive = new MongoRawArchive(URL, 90);
  const client = new MongoClient(URL);
  const call = {
    operation: 'dailyBars' as const,
    tickers: ['BRK.B', 'AAPL'],
    range: { from: '2026-11-02', to: '2026-11-24' },
  };

  beforeAll(() => archive.clear());
  afterAll(async () => {
    await archive.clear();
    await archive.onModuleDestroy();
    await client.close();
  });

  it('stores each answer of a capture and reads them back in order', async () => {
    const fetch = capturingFetch('alpaca', answering(200, BODY));
    const result = await archive.capture(call, async () => {
      await fetch('https://data.example/v2/stocks/bars?page=1');
      await fetch('https://data.example/v2/stocks/bars?page=2');
      return 'done';
    });
    expect(result).toBe('done');

    const [capture] = await archive.captures({ ticker: 'BRK.B', limit: 5 });
    expect(capture).toMatchObject({
      provider: 'alpaca',
      operation: 'dailyBars',
      tickers: ['BRK.B', 'AAPL'],
      from: '2026-11-02',
      to: '2026-11-24',
      exchanges: 2,
      statuses: [200],
      bytes: 2 * Buffer.byteLength(BODY),
    });

    const exchanges = await archive.exchanges(capture!.id);
    expect(exchanges.map((exchange) => exchange.url)).toEqual([
      'https://data.example/v2/stocks/bars?page=1',
      'https://data.example/v2/stocks/bars?page=2',
    ]);
    // The text, byte for byte: 412.105 is not a double.
    expect(exchanges[0]).toMatchObject({ status: 200, body: BODY, call });
  });

  it('keeps the answers of a call that then failed', async () => {
    const fetch = capturingFetch('yahoo', answering(429, 'Too Many Requests'));
    await expect(
      archive.capture({ ...call, tickers: ['NVDA'] }, async () => {
        await fetch('https://chart.example/v8/finance/chart/NVDA');
        throw new Error('rate limited');
      }),
    ).rejects.toThrow('rate limited');

    const [capture] = await archive.captures({ ticker: 'NVDA', limit: 5 });
    expect(capture).toMatchObject({ exchanges: 1, statuses: [429] });
  });

  it('stores the body as a document too, and an expiry MongoDB acts on', async () => {
    const collection = client.db().collection('raw_payloads');
    const document = await collection.findOne({
      'capture.tickers': 'BRK.B',
      'capture.seq': 0,
    });
    expect(document?.payload).toEqual({
      bars: { 'BRK.B': [{ c: 412.105, v: 3100000 }] },
      next_page_token: null,
    });
    const days =
      (document!.expiresAt.getTime() - document!.fetchedAt.getTime()) / 86_400_000;
    expect(days).toBe(90);

    const ttl = (await collection.indexes()).find(
      (index) => index.expireAfterSeconds !== undefined,
    );
    expect(ttl).toMatchObject({ key: { expiresAt: 1 }, expireAfterSeconds: 0 });
  });

  it('does not fail the call when MongoDB is unreachable', async () => {
    // Nothing listens on port 9; the driver gives up after three seconds.
    const down = new MongoRawArchive('mongodb://localhost:9/none', 90);
    const fetch = capturingFetch('alpaca', answering(200, BODY));
    const result = await down.capture(call, async () => {
      await fetch('https://data.example/v2/stocks/bars');
      return 'done';
    });
    expect(result).toBe('done');
    await down.onModuleDestroy();
  }, 15_000);
});
