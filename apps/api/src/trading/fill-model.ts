import {
  CASH_PLACES,
  PRICE_PLACES,
  QUANTITY_PLACES,
  add,
  compare,
  decimal,
  format,
  multiply,
  round,
  sign,
  type Decimal,
} from '../common/decimal';

// The fill model shared by paper trading and the backtester (ADR 0008,
// ROADMAP Phase 3 item 1). Pure functions over decimal strings: given an
// order and the prices it meets, they say whether it fills, at what price,
// and what it costs. Nothing here knows about time, the calendar, or the
// database; the caller decides which bar an order is allowed to see.
//
// The cases in packages/shared/fixtures/fill-model.json are the contract:
// this module and the Python port (Phase 5) must both reproduce them.

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';

export interface FillOrder {
  side: OrderSide;
  type: OrderType;
  /** Shares, above zero, up to 6 decimal places. */
  quantity: string;
  /** Required for a limit order; ignored for a market order. */
  limitPrice: string | null;
}

/** One session's raw (unadjusted) prices. */
export interface FillBar {
  open: string;
  high: string;
  low: string;
  close: string;
}

/** A portfolio's trading costs. */
export interface FillCosts {
  /** Slippage on market-priced fills, in basis points (1 bp = 0.01%). */
  slippageBps: number;
  /** Charged once per filled order. */
  commissionPerOrder: string;
  /** Charged per share filled. */
  commissionPerShare: string;
}

/**
 * Why the order filled at this price:
 * - `market_open`: a market order at the session's open
 * - `market_last`: a market order at the latest known price, mid-session
 * - `limit_open`: a limit order the open had already passed
 * - `limit_cross`: a limit order the session traded through
 */
export type FillRule =
  | 'market_open'
  | 'market_last'
  | 'limit_open'
  | 'limit_cross';

export interface Fill {
  rule: FillRule;
  /** Per share, 6 decimal places. */
  price: string;
  /** `quantity × price`, in cents. Never includes the commission. */
  notional: string;
  /** In cents. */
  commission: string;
}

const MAX_SLIPPAGE_BPS = 1000;

function positive(value: string, name: string, maxPlaces: number): Decimal {
  const parsed = decimal(value);
  if (sign(parsed) <= 0) throw new RangeError(`${name} must be above zero`);
  if (parsed.scale > maxPlaces) {
    throw new RangeError(`${name} has more than ${maxPlaces} decimal places`);
  }
  return parsed;
}

function nonNegative(value: string, name: string): Decimal {
  const parsed = decimal(value);
  if (sign(parsed) < 0) throw new RangeError(`${name} must not be negative`);
  return parsed;
}

/**
 * A market price moved against the trader by the slippage: up for a buy,
 * down for a sell. The leftover digits round against the trader too.
 */
function slip(price: Decimal, side: OrderSide, slippageBps: number): Decimal {
  if (
    !Number.isInteger(slippageBps) ||
    slippageBps < 0 ||
    slippageBps > MAX_SLIPPAGE_BPS
  ) {
    throw new RangeError(
      `slippageBps must be a whole number from 0 to ${MAX_SLIPPAGE_BPS}`,
    );
  }
  const bps = BigInt(side === 'buy' ? 10_000 + slippageBps : 10_000 - slippageBps);
  return round(
    multiply(price, { digits: bps, scale: 4 }),
    PRICE_PLACES,
    side === 'buy' ? 'ceil' : 'floor',
  );
}

function fill(
  rule: FillRule,
  price: Decimal,
  quantity: Decimal,
  costs: FillCosts,
): Fill {
  const commission = add(
    nonNegative(costs.commissionPerOrder, 'commissionPerOrder'),
    multiply(
      nonNegative(costs.commissionPerShare, 'commissionPerShare'),
      quantity,
    ),
  );
  return {
    rule,
    price: format(round(price, PRICE_PLACES)),
    notional: format(round(multiply(quantity, price), CASH_PLACES)),
    commission: format(round(commission, CASH_PLACES)),
  };
}

/**
 * The order against one session's bar, or null when it doesn't fill.
 *
 * The caller passes only a bar whose session opened after the order was
 * placed. That one rule is the look-ahead guard: an order never fills on
 * prices that existed before it did.
 *
 * - Market: fills at the open, plus slippage.
 * - Limit: if the open is already past the limit, fills at the open plus
 *   slippage, but never worse than the limit. Otherwise fills at the limit
 *   when the session trades through it. A bar that only touches the limit
 *   doesn't fill: a real order at that price waits in a queue.
 */
export function fillOnBar(
  order: FillOrder,
  bar: FillBar,
  costs: FillCosts,
): Fill | null {
  const quantity = positive(order.quantity, 'quantity', QUANTITY_PLACES);
  const open = positive(bar.open, 'open', PRICE_PLACES);
  const buying = order.side === 'buy';

  if (order.type === 'market') {
    return fill(
      'market_open',
      slip(open, order.side, costs.slippageBps),
      quantity,
      costs,
    );
  }

  const limit = positive(order.limitPrice ?? '', 'limitPrice', PRICE_PLACES);
  const openPassedLimit = buying
    ? compare(open, limit) < 0
    : compare(open, limit) > 0;
  if (openPassedLimit) {
    const slipped = slip(open, order.side, costs.slippageBps);
    const worseThanLimit = buying
      ? compare(slipped, limit) > 0
      : compare(slipped, limit) < 0;
    return fill('limit_open', worseThanLimit ? limit : slipped, quantity, costs);
  }

  const tradedThrough = buying
    ? compare(positive(bar.low, 'low', PRICE_PLACES), limit) < 0
    : compare(positive(bar.high, 'high', PRICE_PLACES), limit) > 0;
  return tradedThrough ? fill('limit_cross', limit, quantity, costs) : null;
}

/**
 * A market order placed while the market is open: fills at the latest known
 * price plus slippage. Until realtime prices exist (Phase 9) that price is
 * the latest stored close. A limit order never fills here; it waits for the
 * next bar.
 */
export function fillAtLastPrice(
  order: FillOrder,
  lastPrice: string,
  costs: FillCosts,
): Fill | null {
  if (order.type !== 'market') return null;
  const quantity = positive(order.quantity, 'quantity', QUANTITY_PLACES);
  const last = positive(lastPrice, 'lastPrice', PRICE_PLACES);
  return fill(
    'market_last',
    slip(last, order.side, costs.slippageBps),
    quantity,
    costs,
  );
}
