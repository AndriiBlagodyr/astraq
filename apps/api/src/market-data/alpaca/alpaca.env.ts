import { z } from 'zod/v4';

// Only the bootstrap CLI talks to Alpaca, so these live outside the api's env
// schema: the server boots without keys, the CLI refuses to start without them.
const alpacaEnvSchema = z.object({
  ALPACA_API_KEY_ID: z.string().min(1),
  ALPACA_API_SECRET_KEY: z.string().min(1),
  ALPACA_DATA_URL: z
    .url({ protocol: /^https?$/ })
    .default('https://data.alpaca.markets'),
  // SIP is the consolidated tape (all US exchanges). The free plan serves it
  // for anything older than 15 minutes; IEX alone carries a few percent of
  // volume, which would make the volume pane misleading.
  ALPACA_FEED: z.enum(['sip', 'iex']).default('sip'),
});

export type AlpacaEnv = z.infer<typeof alpacaEnvSchema>;

/** Validates a raw environment. Exported for tests; the CLI uses `loadAlpacaEnv`. */
export function parseAlpacaEnv(source: Record<string, string | undefined>) {
  return alpacaEnvSchema.safeParse(source);
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
