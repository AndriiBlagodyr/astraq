import { createHash, randomBytes } from 'node:crypto';

/** 256 bits of entropy, base64url-encoded. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 of the token as Uint8Array (Prisma Bytes / BYTEA). */
export function hashRefreshToken(token: string): Uint8Array<ArrayBuffer> {
  // Prisma's Bytes type is Uint8Array<ArrayBuffer>; Node's digest() is Buffer
  // (ArrayBufferLike), so copy into a fresh ArrayBuffer-backed view.
  const digest = createHash('sha256').update(token).digest();
  const bytes = new Uint8Array(digest.byteLength);
  bytes.set(digest);
  return bytes;
}

/** Session lifetime: 90 days from login. Rotation never extends it. */
export function sessionExpiresAt(from: Date): Date {
  return new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);
}

/** Refresh token lifetime: 30 days, capped at session expiry. */
export function refreshTokenExpiresAt(from: Date, sessExpiry: Date): Date {
  const natural = new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
  return natural < sessExpiry ? natural : sessExpiry;
}
