import { parseAlpacaEnv } from './alpaca.env';

describe('alpaca env validation', () => {
  it('requires both keys', () => {
    const result = parseAlpacaEnv({ ALPACA_API_KEY_ID: 'key' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      'ALPACA_API_SECRET_KEY',
    ]);
  });

  it('defaults to the SIP feed on the public data host', () => {
    const result = parseAlpacaEnv({
      ALPACA_API_KEY_ID: 'key',
      ALPACA_API_SECRET_KEY: 'secret',
    });

    expect(result.data).toMatchObject({
      ALPACA_DATA_URL: 'https://data.alpaca.markets',
      ALPACA_FEED: 'sip',
    });
  });
});
