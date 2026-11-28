import { randomBytes } from 'node:crypto';
import { Algorithm, hash, verify } from '@node-rs/argon2';

/**
 * A password to hand to someone else: 120 random bits as 20 base64url
 * characters. Shown once by the admin endpoints and stored only as a hash.
 */
export function generatePassword(): string {
  return randomBytes(15).toString('base64url');
}

const PARAMS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  algorithm: Algorithm.Argon2id,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, PARAMS);
}

export async function verifyPassword(
  stored: string,
  password: string,
): Promise<boolean> {
  return verify(stored, password, PARAMS);
}

/** True when the stored hash used different Argon2 parameters and should be re-hashed on next login. */
export function needsRehash(stored: string): boolean {
  return (
    !stored.includes(`m=${PARAMS.memoryCost}`) ||
    !stored.includes(`t=${PARAMS.timeCost}`) ||
    !stored.includes(`p=${PARAMS.parallelism}`)
  );
}
