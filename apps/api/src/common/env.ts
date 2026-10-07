import { z } from 'zod/v4';
import { LOCAL_DEFAULTS } from './local-defaults';

// Production gets no defaults: a missing value there is a deploy mistake, not
// something to paper over. REDIS_URL joins this list with the first module
// that uses Redis (BullMQ, Phase 3); until then a deploy needs no Redis.
const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'CORS_ORIGINS',
] as const satisfies ReadonlyArray<keyof typeof LOCAL_DEFAULTS>;

// An origin is scheme + host + port only. `new URL(x).origin === x` rejects
// paths, trailing slashes and queries, which the browser never sends.
const origin = z
  .url({ protocol: /^https?$/ })
  .refine((value) => new URL(value).origin === value, {
    message: 'Must be an origin like https://app.example.com (no path)',
  });

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
    // Comma-separated, e.g. "https://veracand.app,https://preview.veracand.app".
    CORS_ORIGINS: z
      .string()
      .transform((value) =>
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      )
      .pipe(z.array(origin).min(1))
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return;
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (value[key] === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'Required in production',
        });
      }
    }
  })
  .transform((value) => ({
    ...value,
    DATABASE_URL: value.DATABASE_URL ?? LOCAL_DEFAULTS.DATABASE_URL,
    REDIS_URL: value.REDIS_URL ?? LOCAL_DEFAULTS.REDIS_URL,
    CORS_ORIGINS: value.CORS_ORIGINS ?? [LOCAL_DEFAULTS.CORS_ORIGINS],
  }));

export type Env = z.infer<typeof envSchema>;

/** Validates a raw environment. Exported for tests; the app uses `env`. */
export function parseEnv(source: Record<string, string | undefined>) {
  return envSchema.safeParse(source);
}

const parsed = parseEnv(process.env);

if (!parsed.success) {
  console.error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
  );
  process.exit(1);
}

export const env = parsed.data;
