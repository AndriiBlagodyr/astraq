import { env } from "./env";

// The api rate-limits by client address, and every call to it comes from
// this server. These two headers tell the api whose request it really is:
// the browser's address, and the secret that proves this server sent it
// (apps/api/src/common/rate-limit-key.ts). Server-side only.

/**
 * The browser's address as the host reports it. Vercel sets both headers
 * itself and overwrites what the client sent; behind another host, make
 * sure its proxy does the same before trusting them.
 */
export function clientIpFrom(headers: Headers): string | null {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

/** The headers for one api call, or none when there's nothing to vouch for. */
export function bffHeaders(clientIp: string | null): Record<string, string> {
  if (!env.BFF_SHARED_SECRET || !clientIp) return {};
  return {
    "x-bff-secret": env.BFF_SHARED_SECRET,
    "x-client-ip": clientIp,
  };
}
