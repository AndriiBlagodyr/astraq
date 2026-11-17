import type { LatestClose, WatchlistMovers } from '@astraq/shared';
import {
  compare,
  decimal,
  isZero,
  multiply,
  type Decimal,
} from '../common/decimal';

// A watchlist's best and worst movers (ROADMAP Phase 2 item 5), picked from
// the closes the rows already show. Prices are decimal strings and stay
// exact here: two day changes are compared as fractions on the api's exact
// decimal (`common/decimal.ts`), never as floats, so two symbols a hair
// apart can't swap places.

export interface MoverCandidate {
  ticker: string;
  /** Null until the symbol has stored candles. */
  latestClose: LatestClose | null;
}

/**
 * The sign of `a.close / a.previousClose - b.close / b.previousClose`,
 * without dividing: for positive denominators, a/b > c/d exactly when
 * a * d > c * b.
 */
function compareChange(a: Session, b: Session): number {
  return compare(
    multiply(a.close, b.previous),
    multiply(b.close, a.previous),
  );
}

type Session = {
  ticker: string;
  latestClose: LatestClose;
  close: Decimal;
  previous: Decimal;
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
    const previous = decimal(latestClose.previousClose);
    if (isZero(previous)) continue;
    sessions.push({
      ticker,
      latestClose,
      close: decimal(latestClose.close),
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
