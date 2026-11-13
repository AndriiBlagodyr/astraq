import {
  CASH_PLACES,
  QUANTITY_PLACES,
  ZERO,
  add,
  compare,
  decimal,
  divide,
  format,
  isZero,
  min,
  multiply,
  negate,
  round,
  sign,
  subtract,
  type Decimal,
} from '../common/decimal';

// Double-entry accounting for a paper portfolio (ADR 0009, ROADMAP Phase 3
// item 2), as pure functions. A portfolio's history is a list of
// transactions; each one's entries sum to zero. Nothing else is stored:
// `replay` folds the history into cash, lots, and realized PnL, and the
// builders below produce the next transaction from that state.
//
// Amounts are decimal strings in cents. A debit is positive, a credit
// negative: buying shares debits securities and credits cash.

export type LedgerAccount =
  | 'cash'
  | 'securities'
  | 'capital'
  | 'fees'
  | 'realized_pnl';

export type LedgerKind = 'deposit' | 'withdrawal' | 'buy' | 'sell';

export interface LedgerEntry {
  account: LedgerAccount;
  /** Set on securities and realized_pnl entries, null on the others. */
  symbolId: number | null;
  /** Cents, 2 decimal places. Debit positive, credit negative. */
  amount: string;
  /** Shares bought (positive) or sold (negative), 6 places; "0.000000" off securities. */
  quantity: string;
}

/** A transaction about to be written: balanced entries and their label. */
export interface Posting {
  kind: LedgerKind;
  entries: LedgerEntry[];
}

export interface LedgerTransaction extends Posting {
  /** Its place in the portfolio's history, from 1. */
  seq: number;
}

/** Shares from one buy that haven't been sold yet, and what they cost. */
export interface Lot {
  symbolId: number;
  /** The buy that opened the lot. */
  openedSeq: number;
  quantity: Decimal;
  /** Cost of the remaining shares, in cents. */
  cost: Decimal;
}

/** Everything derived from a ledger. */
export interface LedgerState {
  cash: Decimal;
  /** Paid in by the owner, less withdrawals. */
  capital: Decimal;
  /** Commissions paid. */
  fees: Decimal;
  /** Gains less losses on sold shares, before fees. */
  realizedPnl: Decimal;
  /** Open lots per symbol, oldest first. A symbol without shares has no key. */
  lots: ReadonlyMap<number, readonly Lot[]>;
}

export type LedgerErrorCode =
  | 'invalid_amount'
  | 'insufficient_cash'
  | 'insufficient_shares'
  /** The stored history doesn't add up: a bug or a tampered row. */
  | 'inconsistent';

export class LedgerError extends Error {
  constructor(
    readonly code: LedgerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LedgerError';
  }
}

export const EMPTY_LEDGER: LedgerState = {
  cash: ZERO,
  capital: ZERO,
  fees: ZERO,
  realizedPnl: ZERO,
  lots: new Map(),
};

function parse(value: string, name: string, places: number): Decimal {
  let parsed: Decimal;
  try {
    parsed = decimal(value);
  } catch {
    throw new LedgerError('invalid_amount', `${name} is not a number`);
  }
  if (parsed.scale > places) {
    throw new LedgerError(
      'invalid_amount',
      `${name} has more than ${places} decimal places`,
    );
  }
  return parsed;
}

function positive(value: string, name: string, places: number): Decimal {
  const parsed = parse(value, name, places);
  if (sign(parsed) <= 0) {
    throw new LedgerError('invalid_amount', `${name} must be above zero`);
  }
  return parsed;
}

const cents = (value: Decimal) => format(round(value, CASH_PLACES));
const shares = (value: Decimal) => format(round(value, QUANTITY_PLACES));

function entry(
  account: LedgerAccount,
  amount: Decimal,
  symbolId: number | null = null,
  quantity: Decimal = ZERO,
): LedgerEntry {
  return { account, symbolId, amount: cents(amount), quantity: shares(quantity) };
}

/**
 * Takes `quantity` shares from the oldest lots first (FIFO) and returns
 * what they cost and the lots left.
 *
 * A lot sold whole gives up its whole cost. A lot sold in part gives up
 * `cost × sold / quantity`, rounded half up to the cent, and keeps the
 * rest, so the cents of a lot's cost are handed out exactly once however
 * many sells it takes.
 */
export function consumeFifo(
  lots: readonly Lot[],
  quantity: Decimal,
): { cost: Decimal; remaining: Lot[] } {
  let left = quantity;
  let cost = ZERO;
  const remaining: Lot[] = [];
  for (const lot of lots) {
    if (isZero(left)) {
      remaining.push(lot);
      continue;
    }
    const taken = min(left, lot.quantity);
    left = subtract(left, taken);
    if (compare(taken, lot.quantity) === 0) {
      cost = add(cost, lot.cost);
      continue;
    }
    const share = divide(multiply(lot.cost, taken), lot.quantity, CASH_PLACES);
    cost = add(cost, share);
    remaining.push({
      ...lot,
      quantity: subtract(lot.quantity, taken),
      cost: subtract(lot.cost, share),
    });
  }
  if (!isZero(left)) {
    throw new LedgerError(
      'insufficient_shares',
      'The portfolio holds fewer shares than the sell needs',
    );
  }
  return { cost, remaining };
}

/**
 * The state after one more transaction. Throws `inconsistent` when the
 * transaction can't follow this state: its entries don't sum to zero, a
 * sell's cost isn't what FIFO gives, or cash would go negative. That makes
 * `replay` an audit of the whole history, not only a sum.
 */
export function apply(
  state: LedgerState,
  transaction: LedgerTransaction,
): LedgerState {
  const fail = (message: string): never => {
    throw new LedgerError(
      'inconsistent',
      `Ledger transaction ${transaction.seq}: ${message}`,
    );
  };

  let { cash, capital, fees, realizedPnl } = state;
  const lots = new Map(state.lots);
  let total = ZERO;

  for (const item of transaction.entries) {
    const amount = parse(item.amount, 'amount', CASH_PLACES);
    const quantity = parse(item.quantity, 'quantity', QUANTITY_PLACES);
    total = add(total, amount);

    if (item.account !== 'securities') {
      if (!isZero(quantity)) fail(`${item.account} entry carries shares`);
      // Capital and realized PnL grow with credits, so their balances flip the sign.
      if (item.account === 'cash') cash = add(cash, amount);
      else if (item.account === 'fees') fees = add(fees, amount);
      else if (item.account === 'capital') capital = subtract(capital, amount);
      else realizedPnl = subtract(realizedPnl, amount);
      continue;
    }

    const symbolId = item.symbolId ?? fail('securities entry without a symbol');
    const held = lots.get(symbolId) ?? [];
    if (sign(quantity) > 0) {
      if (sign(amount) < 0) fail('a buy with a negative cost');
      lots.set(symbolId, [
        ...held,
        { symbolId, openedSeq: transaction.seq, quantity, cost: amount },
      ]);
    } else if (sign(quantity) < 0) {
      let sold: ReturnType<typeof consumeFifo>;
      try {
        sold = consumeFifo(held, negate(quantity));
      } catch {
        return fail('sells more shares than the portfolio holds');
      }
      if (compare(sold.cost, negate(amount)) !== 0) {
        fail(
          `sold shares cost ${cents(sold.cost)} by FIFO, the entry says ${cents(negate(amount))}`,
        );
      }
      if (sold.remaining.length > 0) lots.set(symbolId, sold.remaining);
      else lots.delete(symbolId);
    } else {
      fail('securities entry without shares');
    }
  }

  if (!isZero(total)) fail(`entries are unbalanced by ${cents(total)}`);
  if (sign(cash) < 0) fail('cash goes below zero');
  return { cash, capital, fees, realizedPnl, lots };
}

/** The state a whole history adds up to. Transactions must be in `seq` order. */
export function replay(
  transactions: readonly LedgerTransaction[],
): LedgerState {
  let state = EMPTY_LEDGER;
  let expected = 1;
  for (const transaction of transactions) {
    if (transaction.seq !== expected) {
      throw new LedgerError(
        'inconsistent',
        `Ledger transaction ${transaction.seq} is out of order: expected ${expected}`,
      );
    }
    state = apply(state, transaction);
    expected += 1;
  }
  return state;
}

/** Cash paid into the portfolio. */
export function deposit(amount: string): Posting {
  const value = positive(amount, 'amount', CASH_PLACES);
  return {
    kind: 'deposit',
    entries: [entry('cash', value), entry('capital', negate(value))],
  };
}

/** Cash taken out. Never more than the portfolio has. */
export function withdrawal(state: LedgerState, amount: string): Posting {
  const value = positive(amount, 'amount', CASH_PLACES);
  if (compare(value, state.cash) > 0) {
    throw new LedgerError(
      'insufficient_cash',
      `Withdrawing ${cents(value)} needs more than the ${cents(state.cash)} in cash`,
    );
  }
  return {
    kind: 'withdrawal',
    entries: [entry('capital', value), entry('cash', negate(value))],
  };
}

/** A fill as the fill model reports it (ADR 0008). */
export interface Trade {
  symbolId: number;
  /** Shares, above zero, up to 6 decimal places. */
  quantity: string;
  /** `quantity × price` in cents, above zero. */
  notional: string;
  /** In cents, zero or more. */
  commission: string;
}

function parseTrade(trade: Trade) {
  const commission = parse(trade.commission, 'commission', CASH_PLACES);
  if (sign(commission) < 0) {
    throw new LedgerError('invalid_amount', 'commission must not be negative');
  }
  return {
    quantity: positive(trade.quantity, 'quantity', QUANTITY_PLACES),
    notional: positive(trade.notional, 'notional', CASH_PLACES),
    commission,
  };
}

/** The commission as an expense paid from cash; nothing when it's zero. */
function commissionEntries(commission: Decimal): LedgerEntry[] {
  if (isZero(commission)) return [];
  return [entry('fees', commission), entry('cash', negate(commission))];
}

/** Shares bought: a new lot at cost, paid from cash. No buying on credit. */
export function buy(state: LedgerState, trade: Trade): Posting {
  const { quantity, notional, commission } = parseTrade(trade);
  const needed = add(notional, commission);
  if (compare(needed, state.cash) > 0) {
    throw new LedgerError(
      'insufficient_cash',
      `The buy needs ${cents(needed)}, the portfolio has ${cents(state.cash)} in cash`,
    );
  }
  return {
    kind: 'buy',
    entries: [
      entry('securities', notional, trade.symbolId, quantity),
      entry('cash', negate(notional)),
      ...commissionEntries(commission),
    ],
  };
}

/**
 * Shares sold: the oldest lots leave at their cost, the proceeds arrive in
 * cash, and the difference is the realized gain or loss. No short selling:
 * the portfolio must hold the shares.
 */
export function sell(state: LedgerState, trade: Trade): Posting {
  const { quantity, notional, commission } = parseTrade(trade);
  const { cost } = consumeFifo(state.lots.get(trade.symbolId) ?? [], quantity);
  if (sign(subtract(add(state.cash, notional), commission)) < 0) {
    throw new LedgerError(
      'insufficient_cash',
      'The commission is more than the proceeds and the cash together',
    );
  }
  const gain = subtract(notional, cost);
  return {
    kind: 'sell',
    entries: [
      entry('cash', notional),
      entry('securities', negate(cost), trade.symbolId, negate(quantity)),
      ...(isZero(gain)
        ? []
        : [entry('realized_pnl', negate(gain), trade.symbolId)]),
      ...commissionEntries(commission),
    ],
  };
}

export interface Position {
  symbolId: number;
  quantity: Decimal;
  /** Cost of the shares still held, in cents. */
  cost: Decimal;
}

/** Shares and cost held per symbol, summed over its lots. */
export function positions(state: LedgerState): Position[] {
  return [...state.lots].map(([symbolId, lots]) => ({
    symbolId,
    quantity: lots.reduce((sum, lot) => add(sum, lot.quantity), ZERO),
    cost: lots.reduce((sum, lot) => add(sum, lot.cost), ZERO),
  }));
}
