import { hasAlpacaKeys, parseAlpacaEnv } from './alpaca.env';

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
      ALPACA_TRADING_URL: 'https://paper-api.alpaca.markets',
      ALPACA_FEED: 'sip',
    });
  });

  it('treats a single key as configured, so the api fails loudly on it', () => {
    expect(hasAlpacaKeys({})).toBe(false);
    expect(hasAlpacaKeys({ ALPACA_API_SECRET_KEY: 'secret' })).toBe(true);
  });
});
