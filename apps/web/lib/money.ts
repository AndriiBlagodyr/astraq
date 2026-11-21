// The little arithmetic the portfolio pages do on the api's cash strings,
// done in whole cents on `bigint`: money is never a float (AGENTS.md).
// The api does the accounting; this only derives what it doesn't serve yet
// (a total return) from figures it does. A ratio for display is the one
// place a float appears, and nothing is computed from it afterwards.

const CASH = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

/** A cash string ("1234.5", "-0.07") as cents; null when it isn't one. */
export function toCents(value: string): bigint | null {
  const match = CASH.exec(value);
  if (!match) return null;
  const [, sign, whole, fraction = ""] = match;
  const cents = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0") || "0");
  return sign ? -cents : cents;
}

/** Cents as a cash string with two decimals: "-0.07". */
export function fromCents(cents: bigint): string {
  const magnitude = cents < 0n ? -cents : cents;
  const text = `${magnitude / 100n}.${String(magnitude % 100n).padStart(2, "0")}`;
  return cents < 0n ? `-${text}` : text;
}

/** `a - b`, or null when either isn't a cash string. */
export function subtractCash(a: string, b: string): string | null {
  const left = toCents(a);
  const right = toCents(b);
  return left === null || right === null ? null : fromCents(left - right);
}

/**
 * `part / whole` as a number for a percent label; null when `whole` is
 * zero or negative, where a share of it means nothing.
 */
export function cashRatio(part: string, whole: string): number | null {
  const numerator = toCents(part);
  const denominator = toCents(whole);
  if (numerator === null || denominator === null || denominator <= 0n) {
    return null;
  }
  return Number(numerator) / Number(denominator);
}

/**
 * Which way a signed figure points, as a `Stat`'s arrow and color: a gain
 * is up and positive, a loss down and negative.
 */
export function cashDirection(value: string) {
  const sign = cashSign(value);
  return {
    trend: sign > 0 ? "up" : sign < 0 ? "down" : "flat",
    tone: sign > 0 ? "positive" : sign < 0 ? "negative" : "neutral",
  } as const;
}

/** -1, 0, or 1; 0 for something that isn't a cash string. */
export function cashSign(value: string): -1 | 0 | 1 {
  const cents = toCents(value);
  if (cents === null || cents === 0n) return 0;
  return cents < 0n ? -1 : 1;
}
