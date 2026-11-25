import { z } from 'zod';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { loadOptionalAlpacaEnv } from '../alpaca/alpaca.env';
import { AlpacaProvider } from '../alpaca/alpaca.provider';
import { YahooProvider } from '../yahoo/yahoo.provider';
import { captureClock, capturingFetch } from './capture';
import type { MarketDataProvider } from './market-data-provider';
import type { Fetch } from './provider-http';

const providerEnvSchema = z.object({
  // Which source bars and corporate actions come from. Unset: Alpaca when
  // its keys are set, otherwise none. Yahoo is used only when asked for: it
  // is unofficial, and one series must not mix two sources (ADR 0010).
  MARKET_DATA_PROVIDER: z.enum(['alpaca', 'yahoo']).optional(),
  YAHOO_CHART_URL: z
    .url({ protocol: /^https?$/ })
    .default('https://query1.finance.yahoo.com'),
});

/** Validates a raw environment. Exported for tests. */
export function parseProviderEnv(source: Record<string, string | undefined>) {
  return providerEnvSchema.safeParse(source);
}

/** What the environment configures: both can be null, and the app still boots. */
export type MarketDataSources = {
  /** The asset list and the exchange calendar: Alpaca only. */
  alpaca: AlpacaClient | null;
  /** Bars and corporate actions, behind the contract. */
  provider: MarketDataProvider | null;
};

/**
 * Reads the market data configuration at boot, exiting with a readable
 * error like the rest of the env: a half-set key pair, or Alpaca asked for
 * without keys, is a deploy mistake.
 */
export function loadMarketDataSources(): MarketDataSources {
  const parsed = parseProviderEnv(process.env);
  if (!parsed.success) {
    console.error(
      `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
    );
    process.exit(1);
  }
  const { MARKET_DATA_PROVIDER: chosen, YAHOO_CHART_URL } = parsed.data;

  // Both adapters go out through a `fetch` that reports to the capture a
  // call is made in, and read the capture's clock (`capture.ts`). Outside a
  // capture (the asset list, the calendar) those are the plain ones.
  const fetch: Fetch = (url, init) => globalThis.fetch(url, init);

  const alpacaEnv = loadOptionalAlpacaEnv();
  const alpaca = alpacaEnv
    ? new AlpacaClient(alpacaEnv, capturingFetch('alpaca', fetch), captureClock)
    : null;
  if (chosen === 'alpaca' && alpaca === null) {
    console.error(
      'MARKET_DATA_PROVIDER=alpaca needs ALPACA_API_KEY_ID and ' +
        'ALPACA_API_SECRET_KEY (see apps/api/.env.example).',
    );
    process.exit(1);
  }

  const provider =
    chosen === 'yahoo'
      ? new YahooProvider(
          YAHOO_CHART_URL,
          capturingFetch('yahoo', fetch),
          captureClock,
        )
      : alpaca && new AlpacaProvider(alpaca);
  return { alpaca, provider };
}
