import { AlpacaClient } from './alpaca.client';

const config = {
  ALPACA_API_KEY_ID: 'key',
  ALPACA_API_SECRET_KEY: 'secret',
  ALPACA_DATA_URL: 'https://data.example',
  ALPACA_TRADING_URL: 'https://trading.example',
  ALPACA_FEED: 'sip' as const,
};

async function barsEnd(to: string, now: string): Promise<string | null> {
  const urls: URL[] = [];
  const client = new AlpacaClient(
    config,
    async (url) => {
      urls.push(new URL(String(url)));
      return new Response('{"bars":{},"next_page_token":null}');
    },
    () => new Date(now),
  );
  for await (const page of client.dailyBarPages(['AAPL'], { from: to, to })) {
    void page;
  }
  return urls[0].searchParams.get('end');
}

describe('AlpacaClient.dailyBarPages', () => {
  it('asks to the end of the last day for a range in the past', async () => {
    expect(await barsEnd('2026-11-20', '2026-11-24T21:30:00.000Z')).toBe(
      '2026-11-20T23:59:59Z',
    );
  });

  it('stops 16 minutes ago when the range ends today', async () => {
    // Half an hour after the close: the free plan refuses the last 15 minutes.
    expect(await barsEnd('2026-11-24', '2026-11-24T21:30:00.000Z')).toBe(
      '2026-11-24T21:14:00Z',
    );
  });
});
