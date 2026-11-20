import {
  PRICE_PLACES,
  ZERO,
  decimal,
  divide,
  multiply,
  subtract,
  type Decimal,
} from '../common/decimal';
import {
  EMPTY_LEDGER,
  apply,
  positions,
  type LedgerTransaction,
} from '../ledger/ledger';
import { valuePortfolio } from './valuation';

// What a portfolio was worth at each session's close (ROADMAP Phase 3 item
// 6, the equity curve), as a pure function. Nothing is stored: the ledger is
// replayed one day at a time and the shares held that evening are priced at
// that evening's closes. The last point is today's reading, the same one
// `valuePortfolio` gives the Holdings tab.

/** One symbol's close on one session, in the shares that traded that day. */
export interface DailyClose {
  symbolId: number;
  /** The session, YYYY-MM-DD. */
  date: string;
  close: string;
}

/** A split of a symbol the ledger names. */
export interface PriceSplit {
  symbolId: number;
  exDate: string;
  from: string;
  to: string;
}

export interface EquityPoint {
  date: string;
  /** Null when a share held that day has no close on or before it. */
  equity: Decimal | null;
  /** Paid in by the owner up to that day, less withdrawals. */
  capital: Decimal;
  /**
   * The day's gain or loss: the change in equity since the point before,
   * less the cash the owner paid in or took out that day. Null when either
   * equity is.
   */
  pnl: Decimal | null;
}

/**
 * A point per day on which something is known: a transaction was booked, or
 * a symbol the ledger names closed. Days before the first transaction have
 * no point; closes from before it only say what a share bought on the first
 * day was worth that evening.
 *
 * `history` is in `seq` order. A split or dividend loaded late is booked
 * after transactions dated later than its ex-date (ADR 0009 section 8); it
 * counts from the day of the transaction before it, so the days already
 * drawn don't change shape under a history that was booked in a different
 * order than it happened.
 *
 * A close is in the shares of its session. Shares held on a later day have
 * been through every split in between, so the close is brought to that
 * day's shares the way settlement converts the lots: `× from / to` for each
 * split that went ex after the bar and no later than the day.
 */
export function equityCurve(
  history: readonly LedgerTransaction[],
  closes: readonly DailyClose[],
  splits: readonly PriceSplit[],
): EquityPoint[] {
  const first = history[0];
  if (!first) return [];

  let latestDate = first.date;
  const booked = history.map((transaction) => {
    if (transaction.date > latestDate) latestDate = transaction.date;
    return { transaction, date: latestDate };
  });
  const bars = [...closes].sort((a, b) => (a.date < b.date ? -1 : 1));
  const dates = [
    ...new Set([
      ...booked.map((item) => item.date),
      ...bars.map((bar) => bar.date).filter((date) => date >= first.date),
    ]),
  ].sort();

  const lastClose = new Map<number, { date: string; close: Decimal }>();
  const priceOn = (symbolId: number, date: string): Decimal | null => {
    const bar = lastClose.get(symbolId);
    if (!bar) return null;
    let price = bar.close;
    for (const split of splits) {
      if (
        split.symbolId === symbolId &&
        split.exDate > bar.date &&
        split.exDate <= date
      ) {
        price = divide(
          multiply(price, decimal(split.from)),
          decimal(split.to),
          PRICE_PLACES,
        );
      }
    }
    return price;
  };

  let state = EMPTY_LEDGER;
  let nextBooked = 0;
  let nextBar = 0;
  let previous: { equity: Decimal | null; capital: Decimal } = {
    equity: ZERO,
    capital: ZERO,
  };

  return dates.map((date) => {
    while (nextBooked < booked.length && booked[nextBooked]!.date <= date) {
      state = apply(state, booked[nextBooked]!.transaction);
      nextBooked += 1;
    }
    while (nextBar < bars.length && bars[nextBar]!.date <= date) {
      const bar = bars[nextBar]!;
      lastClose.set(bar.symbolId, { date: bar.date, close: decimal(bar.close) });
      nextBar += 1;
    }

    const { equity } = valuePortfolio(
      state.cash,
      state.receivable,
      positions(state).map((position) => ({
        ...position,
        price: priceOn(position.symbolId, date),
      })),
    );
    const pnl =
      equity === null || previous.equity === null
        ? null
        : subtract(
            subtract(equity, previous.equity),
            subtract(state.capital, previous.capital),
          );
    previous = { equity, capital: state.capital };
    return { date, equity, capital: state.capital, pnl };
  });
}
