import type { z } from 'zod';
import { parseJsonExact } from './exact-json';
import { ProviderError, type ProviderName } from './market-data-provider';

/** `fetch`, injectable so the contract tests can replay recorded responses. */
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

type GetOptions<Schema extends z.ZodType> = {
  provider: ProviderName;
  fetch: Fetch;
  url: URL;
  headers?: Record<string, string>;
  schema: Schema;
};

/** `Retry-After` in milliseconds: the header is seconds or an HTTP date. */
function retryAfterMs(header: string | null): number | null {
  if (header === null) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

/**
 * One GET against a provider, where the failure modes of the contract are
 * decided (see `ProviderError`). The body is parsed with `parseJsonExact`,
 * so every number reaches the schema as its source text. A 404 resolves to
 * null: whether that means "no such ticker" or a wrong URL is the
 * adapter's to say.
 */
export async function providerGet<Schema extends z.ZodType>(
  options: GetOptions<Schema>,
): Promise<z.infer<Schema> | null> {
  const { provider, url, schema } = options;
  const what = `${provider} ${url.pathname}`;

  let response: Response;
  let body: string;
  try {
    response = await options.fetch(url.toString(), {
      headers: { accept: 'application/json', ...options.headers },
      // One page of one request. Without it a stalled response holds the
      // caller (a watchlist add waits on this) for undici's 5 minutes.
      signal: AbortSignal.timeout(30_000),
    });
    body = await response.text();
  } catch (error) {
    throw new ProviderError(
      provider,
      'unavailable',
      `${what} got no answer: ${error instanceof Error ? error.message : String(error)}`,
      null,
      { cause: error },
    );
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    const message = `${what} failed with ${response.status}: ${body.slice(0, 500)}`;
    if (response.status === 429) {
      throw new ProviderError(
        provider,
        'rate_limited',
        message,
        retryAfterMs(response.headers.get('retry-after')),
      );
    }
    throw new ProviderError(
      provider,
      response.status >= 500 || response.status === 408
        ? 'unavailable'
        : 'rejected',
      message,
    );
  }

  let json: unknown;
  try {
    json = parseJsonExact(body);
  } catch (error) {
    throw new ProviderError(
      provider,
      'malformed',
      `${what} did not answer with JSON: ${body.slice(0, 200)}`,
      null,
      { cause: error },
    );
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ProviderError(
      provider,
      'malformed',
      `${what} answered in an unexpected shape: ${parsed.error.message.slice(0, 500)}`,
      null,
      { cause: parsed.error },
    );
  }
  return parsed.data;
}
