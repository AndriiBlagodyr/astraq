import {
  CASH_PLACES,
  ZERO,
  add,
  multiply,
  round,
  subtract,
  type Decimal,
} from '../common/decimal';

// What a portfolio is worth at the latest known prices, as pure functions
// (ROADMAP Phase 3 item 6). The ledger knows what the shares cost; this
// prices them. Nothing here is stored: a valuation is a reading of the
// books against today's prices, and tomorrow's is a different reading.

/** Shares held in one symbol and the price to value them at. */
export interface Holding {
  quantity: Decimal;
  /** What the shares cost, in cents. */
  cost: Decimal;
  /** Per share, in the shares held today; null when the symbol has no bar. */
  price: Decimal | null;
}

export interface HoldingValue {
  /** `quantity × price` in cents; null without a price. */
  marketValue: Decimal | null;
  /** `marketValue - cost`; null without a price. */
  unrealizedPnl: Decimal | null;
}

export interface PortfolioValue {
  /** One per holding, in the order given. */
  holdings: HoldingValue[];
  /** Null when any holding has no price: a partial sum would read as the whole. */
  marketValue: Decimal | null;
  unrealizedPnl: Decimal | null;
  /** `cash + dividends owed + marketValue`; null with `marketValue`. */
  equity: Decimal | null;
}

/** One holding at its price, in cents (half-up, like a fill's notional). */
export function valueHolding(holding: Holding): HoldingValue {
  if (holding.price === null) return { marketValue: null, unrealizedPnl: null };
  const marketValue = round(
    multiply(holding.quantity, holding.price),
    CASH_PLACES,
  );
  return { marketValue, unrealizedPnl: subtract(marketValue, holding.cost) };
}

/**
 * The portfolio's holdings at their prices, and what it all comes to.
 *
 * With every holding priced, `equity` equals capital plus realized PnL,
 * dividend income, and unrealized PnL, less fees: the ledger's own identity
 * (ADR 0009) with the shares at market instead of at cost.
 */
export function valuePortfolio(
  cash: Decimal,
  receivable: Decimal,
  holdings: Holding[],
): PortfolioValue {
  const values = holdings.map(valueHolding);
  if (values.some((value) => value.marketValue === null)) {
    return { holdings: values, marketValue: null, unrealizedPnl: null, equity: null };
  }
  const marketValue = values.reduce(
    (sum, value) => add(sum, value.marketValue!),
    round(ZERO, CASH_PLACES),
  );
  const unrealizedPnl = values.reduce(
    (sum, value) => add(sum, value.unrealizedPnl!),
    round(ZERO, CASH_PLACES),
  );
  return {
    holdings: values,
    marketValue,
    unrealizedPnl,
    equity: add(add(cash, receivable), marketValue),
  };
}
