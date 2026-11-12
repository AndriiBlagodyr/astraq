import type { LatestClose, WatchlistMovers } from '@astraq/shared';

// A watchlist's best and worst movers (ROADMAP Phase 2 item 5), picked from
// the closes the rows already show. Prices are decimal strings and stay
// exact here: two day changes are compared as fractions of integers, never
// as floats, so two symbols a hair apart can't swap places.

export interface MoverCandidate {
  ticker: string;
  /** Null until the symbol has stored candles. */
  latestClose: LatestClose | null;
}

/** A decimal string as an integer and the power of ten it was scaled by. */
function toScaled(value: string): { digits: bigint; scale: number } {
  const [whole = '0', fraction = ''] = value.split('.');
  return { digits: BigInt(whole + fraction), scale: fraction.length };
}

/**
 * The sign of `a.close / a.previousClose - b.close / b.previousClose`,
 * without dividing: for positive denominators, a/b > c/d exactly when
 * a * d > c * b. Each side is brought to the same power of ten first.
 */
function compareChange(a: Session, b: Session): number {
  const left = { digits: a.close.digits * b.previous.digits, scale: a.close.scale + b.previous.scale };
  const right = { digits: b.close.digits * a.previous.digits, scale: b.close.scale + a.previous.scale };
  const scale = Math.max(left.scale, right.scale);
  const l = left.digits * 10n ** BigInt(scale - left.scale);
  const r = right.digits * 10n ** BigInt(scale - right.scale);
  return l > r ? 1 : l < r ? -1 : 0;
}

type Session = {
  ticker: string;
  latestClose: LatestClose;
  close: ReturnType<typeof toScaled>;
  previous: ReturnType<typeof toScaled>;
};

/**
 * The biggest gain and the biggest loss among `items`, by day change.
 *
 * Only symbols whose last bar is the list's newest session take part: a
 * delisted symbol's final day would otherwise stay a "mover today" for
 * good. A symbol needs a previous close above zero to have a change at all.
 * Ties go to the symbol higher on the list. One symbol is the best mover
 * and nothing is the worst, so a list never names the same symbol twice.
 */
export function pickMovers(items: readonly MoverCandidate[]): WatchlistMovers {
  let newest = '';
  for (const { latestClose } of items) {
    // ISO dates order as strings.
    if (latestClose && latestClose.date > newest) newest = latestClose.date;
  }

  const sessions: Session[] = [];
  for (const { ticker, latestClose } of items) {
    if (!latestClose || latestClose.date !== newest) continue;
    if (latestClose.previousClose === null) continue;
    const previous = toScaled(latestClose.previousClose);
    if (previous.digits === 0n) continue;
    sessions.push({
      ticker,
      latestClose,
      close: toScaled(latestClose.close),
      previous,
    });
  }

  let best: Session | null = null;
  let worst: Session | null = null;
  for (const session of sessions) {
    if (!best || compareChange(session, best) > 0) best = session;
    if (!worst || compareChange(session, worst) < 0) worst = session;
  }

  const mover = ({ ticker, latestClose }: Session) => ({ ticker, latestClose });
  return {
    best: best ? mover(best) : null,
    worst: worst && worst !== best ? mover(worst) : null,
  };
}
