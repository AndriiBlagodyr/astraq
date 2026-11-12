import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

// Whose bucket a request counts against (ROADMAP Phase 2 item 3).
//
// The browser never calls the api: the web's server (the BFF) does, for
// every user. The address the api sees is therefore the web server's, and
// keyed on that, all users would share one bucket: ten failed logins from
// anyone would lock sign-in for everyone.
//
// So the BFF names the browser's address in a header, and proves it is the
// BFF with a secret both sides hold. Without the proof the header is
// ignored, because the api's domain is public and anyone could send it to
// get a fresh bucket per request.

export const BFF_SECRET_HEADER = 'x-bff-secret';
export const CLIENT_IP_HEADER = 'x-client-ip';

type RequestLike = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

/** Equal without leaking, through timing, how much of the secret matched. */
function sameSecret(offered: string, secret: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(offered), digest(secret));
}

/**
 * The address a request was made from: the browser's when the BFF vouches
 * for it, or the request's own (`req.ip`, the nearest proxy's view) for
 * anyone else. Also what a session records as its device's address: without
 * it every device on the Sessions page would show the web server's.
 */
export function clientAddress(
  request: RequestLike,
  secret: string | null,
): string | null {
  const own = request.ip ?? null;
  if (!secret) return own;

  const offered = request.headers[BFF_SECRET_HEADER];
  const clientIp = request.headers[CLIENT_IP_HEADER];
  if (typeof offered !== 'string' || typeof clientIp !== 'string') return own;
  if (!sameSecret(offered, secret) || isIP(clientIp) === 0) return own;
  return clientIp;
}

/** The bucket a request's rate limits count against: its client address. */
export function rateLimitKey(request: RequestLike, secret: string | null): string {
  return clientAddress(request, secret) ?? 'unknown';
}
