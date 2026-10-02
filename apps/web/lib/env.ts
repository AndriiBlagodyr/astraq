import { z } from "zod";

// Server-side env for apps/web. Validated once at boot by instrumentation.ts,
// so a bad value stops the server instead of failing on the first request.
// Never import this from a client component: only NEXT_PUBLIC_* values reach
// the browser.
const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  API_URL: z.url().default("http://localhost:4000"),
  ML_URL: z.url().default("http://localhost:8000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
