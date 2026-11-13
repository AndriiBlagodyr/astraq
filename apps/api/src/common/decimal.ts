// Exact decimal arithmetic for money, prices, and share quantities, built by
// hand on bigint (ADR 0009). A value is an integer and the power of ten it
// was scaled by: 12.50 is { digits: 1250n, scale: 2 }. Sums and products are
// exact; the only place a value loses digits is `round` and `divide`, which
// name the number of places and the rounding mode. No float ever holds an
// amount. In production we'd use decimal.js (what Prisma hands back for
// `numeric` columns) or a money library; the Python side uses `Decimal`.

export interface Decimal {
  readonly digits: bigint;
  readonly scale: number;
}

/**
 * How `round` and `divide` drop digits:
 * - `half-up`: to the nearest, a tie away from zero (Python's ROUND_HALF_UP)
 * - `ceil`: toward positive infinity
 * - `floor`: toward negative infinity
 */
export type RoundingMode = 'half-up' | 'ceil' | 'floor';

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export const ZERO: Decimal = { digits: 0n, scale: 0 };

/** Decimal places the database keeps: `numeric(x, 6)` prices and share counts, cents for cash. */
export const PRICE_PLACES = 6;
export const QUANTITY_PLACES = 6;
export const CASH_PLACES = 2;

/** Parses a plain decimal string ("12", "-0.125"). No exponents, no spaces. */
export function decimal(value: string): Decimal {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new RangeError(`Not a decimal number: "${value}"`);
  }
  const [whole = '0', fraction = ''] = value.split('.');
  return { digits: BigInt(whole + fraction), scale: fraction.length };
}

/** The digits of `value` at a scale of `scale` places, which must not be smaller. */
function digitsAt(value: Decimal, scale: number): bigint {
  return value.digits * 10n ** BigInt(scale - value.scale);
}

export function add(a: Decimal, b: Decimal): Decimal {
  const scale = Math.max(a.scale, b.scale);
  return { digits: digitsAt(a, scale) + digitsAt(b, scale), scale };
}

export function negate(value: Decimal): Decimal {
  return { digits: -value.digits, scale: value.scale };
}

export function subtract(a: Decimal, b: Decimal): Decimal {
  return add(a, negate(b));
}

export function multiply(a: Decimal, b: Decimal): Decimal {
  return { digits: a.digits * b.digits, scale: a.scale + b.scale };
}

/** Negative, zero, or positive as `a` is below, equal to, or above `b`. */
export function compare(a: Decimal, b: Decimal): number {
  const scale = Math.max(a.scale, b.scale);
  const left = digitsAt(a, scale);
  const right = digitsAt(b, scale);
  return left > right ? 1 : left < right ? -1 : 0;
}

export function sign(value: Decimal): number {
  return value.digits > 0n ? 1 : value.digits < 0n ? -1 : 0;
}

export function isZero(value: Decimal): boolean {
  return value.digits === 0n;
}

export function min(a: Decimal, b: Decimal): Decimal {
  return compare(a, b) <= 0 ? a : b;
}

/** `numerator / denominator` as an integer, rounded by `mode`. */
function divideIntegers(
  numerator: bigint,
  denominator: bigint,
  mode: RoundingMode,
): bigint {
  if (denominator === 0n) throw new RangeError('Division by zero');
  // Make the denominator positive so the remainder's sign is the quotient's.
  const n = denominator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  // BigInt division truncates toward zero.
  const quotient = n / d;
  const remainder = n % d;
  if (remainder === 0n) return quotient;
  const negative = remainder < 0n;
  if (mode === 'ceil') return negative ? quotient : quotient + 1n;
  if (mode === 'floor') return negative ? quotient - 1n : quotient;
  const twice = (negative ? -remainder : remainder) * 2n;
  if (twice < d) return quotient;
  return negative ? quotient - 1n : quotient + 1n;
}

/** `value` at exactly `places` decimal places. Never adds precision it lacks. */
export function round(
  value: Decimal,
  places: number,
  mode: RoundingMode = 'half-up',
): Decimal {
  if (value.scale <= places) {
    return { digits: digitsAt(value, places), scale: places };
  }
  const divisor = 10n ** BigInt(value.scale - places);
  return { digits: divideIntegers(value.digits, divisor, mode), scale: places };
}

/** `a / b` at `places` decimal places. */
export function divide(
  a: Decimal,
  b: Decimal,
  places: number,
  mode: RoundingMode = 'half-up',
): Decimal {
  // a / b = (a.digits / b.digits) * 10^(b.scale - a.scale); scale the
  // numerator so the integer quotient lands on `places`.
  const shift = places + b.scale - a.scale;
  const numerator = shift >= 0 ? a.digits * 10n ** BigInt(shift) : a.digits;
  const denominator =
    shift >= 0 ? b.digits : b.digits * 10n ** BigInt(-shift);
  return {
    digits: divideIntegers(numerator, denominator, mode),
    scale: places,
  };
}

/** The value as a plain decimal string with all of its `scale` places. */
export function format(value: Decimal): string {
  const negative = value.digits < 0n;
  const digits = (negative ? -value.digits : value.digits)
    .toString()
    .padStart(value.scale + 1, '0');
  const whole = digits.slice(0, digits.length - value.scale);
  const fraction = digits.slice(digits.length - value.scale);
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}
