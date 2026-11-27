import { createHmac, timingSafeEqual } from 'node:crypto';

const ALG = 'HS256';

function b64url(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return buf.toString('base64url');
}

function fromB64url(data: string): Buffer {
  return Buffer.from(data, 'base64url');
}

export interface JwtPayload {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
  /**
   * Present (and true) while the account's password must be replaced:
   * `JwtAuthGuard` lets such a token reach only the routes that say so.
   */
  pwd?: true;
}

/** What a token says beyond who and which session. */
export interface JwtClaims {
  mustChangePassword?: boolean;
  /** The token must not outlive this time (a review account's end date). */
  notAfter?: Date;
}

/** Access token lifetime. The web's cookie mirrors it (lib/auth-cookies.ts). */
const LIFETIME_SEC = 10 * 60;

const HEADER = b64url(JSON.stringify({ alg: ALG, typ: 'JWT' }));

export function signJwt(
  sub: string,
  sid: string,
  secret: string,
  nowSec: number,
  claims: JwtClaims = {},
): string {
  const natural = nowSec + LIFETIME_SEC;
  const cap = claims.notAfter
    ? Math.floor(claims.notAfter.getTime() / 1000)
    : natural;
  const payload: JwtPayload = {
    sub,
    sid,
    iat: nowSec,
    exp: Math.min(natural, cap),
    ...(claims.mustChangePassword && { pwd: true as const }),
  };
  const body = b64url(JSON.stringify(payload));
  const message = `${HEADER}.${body}`;
  const sig = createHmac('sha256', secret).update(message).digest();
  return `${message}.${b64url(sig)}`;
}

export type JwtVerifyResult =
  | { ok: true; payload: JwtPayload }
  | { ok: false; reason: 'invalid' | 'expired' };

const CLOCK_LEEWAY_SEC = 5;

export function verifyJwt(
  token: string,
  secret: string,
  nowSec: number,
): JwtVerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'invalid' };
  const [headerB64, bodyB64, sigB64] = parts as [string, string, string];

  let header: unknown;
  try {
    header = JSON.parse(fromB64url(headerB64).toString('utf8'));
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (
    typeof header !== 'object' ||
    header === null ||
    (header as Record<string, unknown>).alg !== ALG
  ) {
    return { ok: false, reason: 'invalid' };
  }

  const message = `${headerB64}.${bodyB64}`;
  const expected = createHmac('sha256', secret).update(message).digest();
  const actual = fromB64url(sigB64);
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return { ok: false, reason: 'invalid' };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(fromB64url(bodyB64).toString('utf8'));
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, reason: 'invalid' };
  }
  const p = payload as JwtPayload;
  if (typeof p.exp !== 'number' || p.exp + CLOCK_LEEWAY_SEC < nowSec) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, payload: p };
}
