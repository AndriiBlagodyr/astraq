import { z } from 'zod';

// The market-data CLIs (bootstrap, symbols:sync) refuse to start without
// keys. The api server reads the same variables but treats them as optional:
// with keys it loads candles on demand for a newly watched symbol, without
// them it still serves everything already stored (see MarketDataModule).
const alpacaEnvSchema = z.object({
  ALPACA_API_KEY_ID: z.string().min(1),
  ALPACA_API_SECRET_KEY: z.string().min(1),
  ALPACA_DATA_URL: z
    .url({ protocol: /^https?$/ })
    .default('https://data.alpaca.markets'),
  // The trading API serves the asset list. Paper keys work against the
  // paper host; live keys need https://api.alpaca.markets.
  ALPACA_TRADING_URL: z
    .url({ protocol: /^https?$/ })
    .default('https://paper-api.alpaca.markets'),
  // SIP is the consolidated tape (all US exchanges). The free plan serves it
  // for anything older than 15 minutes; IEX alone carries a few percent of
  // volume, which would make the volume pane misleading.
  ALPACA_FEED: z.enum(['sip', 'iex']).default('sip'),
});

export type AlpacaEnv = z.infer<typeof alpacaEnvSchema>;

/** Validates a raw environment. Exported for tests; the CLIs use `loadAlpacaEnv`. */
export function parseAlpacaEnv(source: Record<string, string | undefined>) {
  return alpacaEnvSchema.safeParse(source);
}

/** True when either key is set: the operator meant to configure Alpaca. */
export function hasAlpacaKeys(
  source: Record<string, string | undefined>,
): boolean {
  return Boolean(source.ALPACA_API_KEY_ID || source.ALPACA_API_SECRET_KEY);
}

/** Returns the Alpaca config, or exits with a readable error like the api does. */
export function loadAlpacaEnv(): AlpacaEnv {
  const parsed = parseAlpacaEnv(process.env);
  if (!parsed.success) {
    console.error(
      `Invalid environment variables:\n${z.prettifyError(parsed.error)}\n` +
        'Put Alpaca keys in apps/api/.env.local (see apps/api/.env.example).',
    );
    process.exit(1);
  }
  return parsed.data;
}

/**
 * The api server's variant: null when no key is set at all, the validated
 * config when both are, and a boot failure when only one is. A half-set
 * pair is a deploy mistake, not a request to run without Alpaca.
 */
export function loadOptionalAlpacaEnv(): AlpacaEnv | null {
  return hasAlpacaKeys(process.env) ? loadAlpacaEnv() : null;
}
