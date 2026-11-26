import { yesterdayUtc } from '../common/dates';
import type { DateRange } from './market-data.types';

/** The first session ever requested. Alpaca's historical SIP data starts in 2016. */
export const HISTORY_FROM = '2016-01-01';

/**
 * A symbol's whole history: from `HISTORY_FROM` through yesterday (UTC),
 * the last session whose bar is certainly final. What the bootstrap CLI,
 * the first watch of a symbol, and the `symbol-backfill` job all load.
 */
export function fullHistory(): DateRange {
  return { from: HISTORY_FROM, to: yesterdayUtc() };
}
