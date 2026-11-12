import { z } from "zod";

// Server-side env for apps/web. Validated once at boot by instrumentation.ts,
// so a bad value stops the server instead of failing on the first request.
// Never import this from a client component: only NEXT_PUBLIC_* values reach
// the browser.
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    API_URL: z.url().default("http://localhost:4000"),
    // Unset in production until the ML service deploys; /status then lists it
    // as not deployed. `pnpm dev` runs it locally, hence the default there.
    ML_URL: z.url().optional(),
    // Shared with the api: sent with every call so the api rate-limits per
    // browser instead of per web server (lib/bff-headers.ts). The local
    // default matches the api's.
    BFF_SHARED_SECRET: z.string().min(32).optional(),
    // The deployed commit, shown on /status. Vercel sets
    // VERCEL_GIT_COMMIT_SHA; COMMIT_SHA lets any other host pass it.
    COMMIT_SHA: z.string().trim().min(1).optional(),
    VERCEL_GIT_COMMIT_SHA: z.string().trim().min(1).optional(),
  })
  .transform(({ VERCEL_GIT_COMMIT_SHA, ...value }) => ({
    ...value,
    ML_URL:
      value.ML_URL ??
      (value.NODE_ENV === "production" ? null : "http://localhost:8000"),
    BFF_SHARED_SECRET:
      value.BFF_SHARED_SECRET ??
      (value.NODE_ENV === "production"
        ? null
        : "dev-bff-secret-at-least-32-bytes-long"),
    COMMIT_SHA: value.COMMIT_SHA ?? VERCEL_GIT_COMMIT_SHA ?? null,
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`
  );
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
