import {
  CASH_PLACES,
  ZERO,
  add,
  compare,
  decimal,
  format,
  round,
  subtract,
  type Decimal,
} from '../common/decimal';
import type { LedgerState } from '../ledger/ledger';
import {
  fillAtLastPrice,
  fillAtLimit,
  type Fill,
  type FillCosts,
  type FillOrder,
} from './fill-model';

// The guards at placement (ROADMAP Phase 3 item 5), as pure functions: can
// the portfolio cover this order, and is it within the portfolio's limit?
// The answer is an estimate. A market order is priced at the latest close,
// a limit order at its limit, and the real fill may differ, so the ledger's
// own refusal at the fill stays (ADR 0009): this check keeps an order that
// can't work today from being accepted, it doesn't promise the fill.

/** An order, open or asked for, and the symbol it trades. */
export interface RiskOrder extends FillOrder {
  symbolId: number;
}

/** Why an order is refused at placement. */
export type RefusalCode =
  | 'insufficient_cash'
  | 'insufficient_shares'
  | 'max_notional';

export interface Refusal {
  code: RefusalCode;
  message: string;
}

export interface RiskInput {
  /** The portfolio's books, settled. */
  state: LedgerState;
  /** The orders still open after settling. */
  open: readonly RiskOrder[];
  request: RiskOrder;
  /** Each symbol's latest close, per share, in the shares that trade today. */
  prices: ReadonlyMap<number, string>;
  costs: FillCosts;
  /** The most one order may come to, before commission; null for no limit. */
  maxOrderNotional: string | null;
}

export interface Assessment {
  /** What the order is expected to cost; null without a price to go by. */
  estimate: Fill | null;
  /** Cash once the order fills at the estimate; null with `estimate`. */
  cashAfter: Decimal | null;
  /** Null when the order may be placed. */
  refusal: Refusal | null;
}

const cents = (amount: Decimal) => format(round(amount, CASH_PLACES));

/**
 * What an order is expected to cost: a market order at the latest close
 * with slippage, a limit order at its limit. Null for a market order on a
 * symbol without a price, or a price the fill model can't use.
 */
export function estimate(
  order: FillOrder,
  lastPrice: string | undefined,
  costs: FillCosts,
): Fill | null {
  try {
    if (order.type === 'limit') return fillAtLimit(order, costs);
    return lastPrice === undefined
      ? null
      : fillAtLastPrice(order, lastPrice, costs);
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

/**
 * Checks an order against the books, in the order a trader would fix them:
 *
 * 1. A sell needs the shares, less what open sell orders already promise.
 * 2. Either side must be within the portfolio's limit per order.
 * 3. A buy needs the cash for its notional and commission, less what open
 *    buy orders are expected to take.
 *
 * Proceeds of open sell orders pay for nothing until they fill. An order
 * without an estimate (a market order on a symbol with no bar) passes the
 * two checks that need one: it can't fill before a bar arrives, and the
 * ledger checks it then.
 */
export function assess(input: RiskInput): Assessment {
  const { state, open, request, prices, costs, maxOrderNotional } = input;
  const expected = estimate(request, prices.get(request.symbolId), costs);
  const total =
    expected && add(decimal(expected.notional), decimal(expected.commission));
  const cashAfter =
    expected && total
      ? request.side === 'buy'
        ? subtract(state.cash, total)
        : subtract(
            add(state.cash, decimal(expected.notional)),
            decimal(expected.commission),
          )
      : null;
  const refuse = (code: RefusalCode, message: string): Assessment => ({
    estimate: expected,
    cashAfter,
    refusal: { code, message },
  });

  if (request.side === 'sell') {
    const held = (state.lots.get(request.symbolId) ?? []).reduce(
      (sum, lot) => add(sum, lot.quantity),
      ZERO,
    );
    const promised = open
      .filter(
        (order) => order.side === 'sell' && order.symbolId === request.symbolId,
      )
      .reduce((sum, order) => add(sum, decimal(order.quantity)), ZERO);
    const free = subtract(held, promised);
    if (compare(decimal(request.quantity), free) > 0) {
      return refuse(
        'insufficient_shares',
        `A sell of ${request.quantity} is more than the ${format(free)} shares free to sell ` +
          `(${format(held)} held, ${format(promised)} in open sell orders). Short selling isn't allowed.`,
      );
    }
  }

  if (
    expected &&
    maxOrderNotional !== null &&
    compare(decimal(expected.notional), decimal(maxOrderNotional)) > 0
  ) {
    return refuse(
      'max_notional',
      `The order comes to about ${expected.notional}, over this portfolio's limit of ` +
        `${cents(decimal(maxOrderNotional))} per order.`,
    );
  }

  if (request.side === 'buy' && total) {
    const reserved = open
      .filter((order) => order.side === 'buy')
      .reduce((sum, order) => {
        const resting = estimate(order, prices.get(order.symbolId), costs);
        return resting
          ? add(sum, add(decimal(resting.notional), decimal(resting.commission)))
          : sum;
      }, ZERO);
    const free = subtract(state.cash, reserved);
    if (compare(total, free) > 0) {
      return refuse(
        'insufficient_cash',
        `The order needs about ${cents(total)} and ${cents(free)} is free ` +
          `(${cents(state.cash)} cash, ${cents(reserved)} set aside for open buy orders).`,
      );
    }
  }

  return { estimate: expected, cashAfter, refusal: null };
}
