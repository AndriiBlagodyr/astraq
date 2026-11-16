import {
  CASH_PLACES,
  PRICE_PLACES,
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
// items 2 and 4), as pure functions. A portfolio's history is a list of
// transactions; each one's entries sum to zero. Nothing else is stored:
// `replay` folds the history into cash, lots, realized PnL, and dividends,
// and the builders below produce the next transaction from that state.
//
// Amounts are decimal strings in cents. A debit is positive, a credit
// negative: buying shares debits securities and credits cash.

export type LedgerAccount =
  | 'cash'
  | 'securities'
  | 'capital'
  | 'fees'
  | 'realized_pnl'
  | 'dividends_receivable'
  | 'dividend_income';

export type LedgerKind =
  | 'deposit'
  | 'withdrawal'
  | 'buy'
  | 'sell'
  | 'split'
  | 'dividend'
  | 'dividend_payment';

export interface LedgerEntry {
  account: LedgerAccount;
  /** Null on cash, capital, and fees entries; set on the others. */
  symbolId: number | null;
  /** Cents, 2 decimal places. Debit positive, credit negative. */
  amount: string;
  /** Shares bought or added by a split (positive) or sold (negative), 6 places; "0.000000" off securities. */
  quantity: string;
}

/** `from` old shares became `to` new ones (NVDA 2024: 1, 10). */
export interface SplitRatio {
  from: string;
  to: string;
}

/** A transaction about to be written: balanced entries and their label. */
export interface Posting {
  kind: LedgerKind;
  entries: LedgerEntry[];
  /** Set on a split, and only there. */
  split?: SplitRatio;
}

export interface LedgerTransaction extends Posting {
  /** Its place in the portfolio's history, from 1. */
  seq: number;
  /**
   * The session the event belongs to, `YYYY-MM-DD` (the New York date of
   * `occurred_at`): the day a lot was bought, a split's or a dividend's
   * ex-date.
   */
  date: string;
}

/** Shares from one buy that haven't been sold yet, and what they cost. */
export interface Lot {
  symbolId: number;
  /** The buy that opened the lot. */
  openedSeq: number;
  /** The session of that buy. Shares bought before an ex-date earn its dividend. */
  openedOn: string;
  /**
   * The session whose shares `quantity` counts: the buy's, then the ex-date
   * of the last split applied. A split converts the lots that are behind it.
   */
  unitsAsOf: string;
  quantity: Decimal;
  /** Cost of the remaining shares, in cents. */
  cost: Decimal;
}

/** A dividend the portfolio earned by holding shares into the ex-date. */
export interface BookedDividend {
  symbolId: number;
  exDate: string;
  /** In cents. */
  amount: Decimal;
  /** False from the ex-date until the cash arrives on the pay date. */
  paid: boolean;
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
  /** Dividends earned, paid or not. */
  dividendIncome: Decimal;
  /** Dividends earned and not yet paid: the unpaid ones in `dividends`. */
  receivable: Decimal;
  /** Open lots per symbol, oldest first. A symbol without shares has no key. */
  lots: ReadonlyMap<number, readonly Lot[]>;
  /** Every dividend booked, in booking order. */
  dividends: readonly BookedDividend[];
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
  dividendIncome: ZERO,
  receivable: ZERO,
  lots: new Map(),
  dividends: [],
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

/** The smallest share count the database keeps: a millionth of a share. */
const ONE_MICRO_SHARE: Decimal = { digits: 1n, scale: QUANTITY_PLACES };

function parseRatio(ratio: SplitRatio) {
  return {
    from: positive(ratio.from, 'split from', PRICE_PLACES),
    to: positive(ratio.to, 'split to', PRICE_PLACES),
  };
}

/**
 * A split applied to a symbol's lots: every lot still counted in shares
 * from before `exDate` gets `quantity × to / from` shares, rounded half up
 * to a millionth, and keeps its cost. Lots bought on or after the ex-date
 * were bought in the new shares and stay as they are, so applying the same
 * split again changes nothing.
 *
 * A lot never rounds to nothing: it keeps at least a millionth of a share,
 * so its cost always has shares to belong to. (A broker would pay cash for
 * the fraction instead.)
 */
export function splitLots(
  lots: readonly Lot[],
  ratio: { from: Decimal; to: Decimal },
  exDate: string,
): { lots: Lot[]; added: Decimal } {
  let added = ZERO;
  const next = lots.map((lot) => {
    if (lot.unitsAsOf >= exDate) return lot;
    const scaled = divide(
      multiply(lot.quantity, ratio.to),
      ratio.from,
      QUANTITY_PLACES,
    );
    const quantity = isZero(scaled) ? ONE_MICRO_SHARE : scaled;
    added = add(added, subtract(quantity, lot.quantity));
    return { ...lot, quantity, unitsAsOf: exDate };
  });
  return { lots: next, added };
}

/**
 * The state after one more transaction. Throws `inconsistent` when the
 * transaction can't follow this state: its entries don't sum to zero, a
 * sell's cost isn't what FIFO gives, a split adds a different number of
 * shares than its ratio does, a dividend is paid that isn't owed, or cash
 * would go negative. That makes `replay` an audit of the whole history,
 * not only a sum.
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

  let { cash, capital, fees, realizedPnl, dividendIncome, receivable } = state;
  let dividends = state.dividends;
  const lots = new Map(state.lots);
  let total = ZERO;

  for (const item of transaction.entries) {
    const amount = parse(item.amount, 'amount', CASH_PLACES);
    const quantity = parse(item.quantity, 'quantity', QUANTITY_PLACES);
    total = add(total, amount);

    if (item.account !== 'securities') {
      if (!isZero(quantity)) fail(`${item.account} entry carries shares`);
      // Capital and the income accounts grow with credits, so their
      // balances flip the sign.
      if (item.account === 'cash') cash = add(cash, amount);
      else if (item.account === 'fees') fees = add(fees, amount);
      else if (item.account === 'capital') capital = subtract(capital, amount);
      else if (item.account === 'realized_pnl') {
        realizedPnl = subtract(realizedPnl, amount);
      } else if (item.account === 'dividend_income') {
        dividendIncome = subtract(dividendIncome, amount);
      } else {
        // dividends_receivable: a debit books a dividend on its ex-date, a
        // credit pays the symbol's oldest unpaid one, in full.
        const symbolId =
          item.symbolId ?? fail('dividend entry without a symbol');
        receivable = add(receivable, amount);
        if (sign(amount) > 0) {
          const exDate = transaction.date;
          if (dividends.some((d) => d.symbolId === symbolId && d.exDate === exDate)) {
            fail(`books the dividend of ${exDate} twice`);
          }
          dividends = [...dividends, { symbolId, exDate, amount, paid: false }];
        } else {
          const index = dividends.findIndex(
            (d) => d.symbolId === symbolId && !d.paid,
          );
          const owed = dividends[index];
          if (!owed || compare(owed.amount, negate(amount)) !== 0) {
            fail(`pays a dividend of ${cents(negate(amount))} that isn't owed`);
          }
          dividends = dividends.map((d, i) =>
            i === index ? { ...d, paid: true } : d,
          );
        }
      }
      continue;
    }

    const symbolId = item.symbolId ?? fail('securities entry without a symbol');
    const held = lots.get(symbolId) ?? [];
    if (transaction.kind === 'split') {
      const ratio = transaction.split ?? fail('split without a ratio');
      if (!isZero(amount)) fail('a split moves no money');
      const result = splitLots(held, parseRatio(ratio), transaction.date);
      if (compare(result.added, quantity) !== 0) {
        fail(
          `the split adds ${shares(result.added)} shares, the entry says ${shares(quantity)}`,
        );
      }
      lots.set(symbolId, result.lots);
    } else if (sign(quantity) > 0) {
      if (sign(amount) < 0) fail('a buy with a negative cost');
      lots.set(symbolId, [
        ...held,
        {
          symbolId,
          openedSeq: transaction.seq,
          openedOn: transaction.date,
          unitsAsOf: transaction.date,
          quantity,
          cost: amount,
        },
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
  return {
    cash,
    capital,
    fees,
    realizedPnl,
    dividendIncome,
    receivable,
    lots,
    dividends,
  };
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

/** A split as the market data reports it. */
export interface Split extends SplitRatio {
  symbolId: number;
  /** First session priced after the split, YYYY-MM-DD. */
  exDate: string;
}

/**
 * A split's effect on the portfolio's lots: one securities entry that adds
 * (or, for a reverse split, takes) shares and moves no money, so the lots
 * keep their cost. Null when no lot changes: nothing was held from before
 * the ex-date, or the split was already applied. The transaction must be
 * dated `exDate`.
 */
export function split(state: LedgerState, action: Split): Posting | null {
  const ratio = parseRatio(action);
  const { added } = splitLots(
    state.lots.get(action.symbolId) ?? [],
    ratio,
    action.exDate,
  );
  if (isZero(added)) return null;
  return {
    kind: 'split',
    split: { from: format(ratio.from), to: format(ratio.to) },
    entries: [entry('securities', ZERO, action.symbolId, added)],
  };
}

/** A cash dividend as the market data reports it. */
export interface Dividend {
  symbolId: number;
  exDate: string;
  /** Cash per share, up to 6 decimal places. */
  cashPerShare: string;
}

/**
 * A dividend going ex: the shares bought before the ex-date earn
 * `shares × cashPerShare`, rounded half up to the cent. It's income now and
 * cash later, so it is booked as a receivable. Null when the portfolio
 * earns nothing or the dividend is already booked. The transaction must be
 * dated `exDate`, and a split on the same date applied first: the amount
 * per share is quoted in the shares that trade that day.
 */
export function dividend(state: LedgerState, action: Dividend): Posting | null {
  const rate = positive(action.cashPerShare, 'cashPerShare', PRICE_PLACES);
  const booked = state.dividends.some(
    (d) => d.symbolId === action.symbolId && d.exDate === action.exDate,
  );
  if (booked) return null;
  const entitled = (state.lots.get(action.symbolId) ?? [])
    .filter((lot) => lot.openedOn < action.exDate)
    .reduce((sum, lot) => add(sum, lot.quantity), ZERO);
  const amount = round(multiply(entitled, rate), CASH_PLACES);
  if (isZero(amount)) return null;
  return {
    kind: 'dividend',
    entries: [
      entry('dividends_receivable', amount, action.symbolId),
      entry('dividend_income', negate(amount), action.symbolId),
    ],
  };
}

/** The symbol's oldest dividend that is booked and not yet paid. */
export function oldestUnpaidDividend(
  state: LedgerState,
  symbolId: number,
): BookedDividend | null {
  return (
    state.dividends.find((d) => d.symbolId === symbolId && !d.paid) ?? null
  );
}

/**
 * The symbol's oldest unpaid dividend arriving in cash, or null when
 * nothing is owed.
 */
export function dividendPayment(
  state: LedgerState,
  symbolId: number,
): Posting | null {
  const owed = oldestUnpaidDividend(state, symbolId);
  if (!owed) return null;
  return {
    kind: 'dividend_payment',
    entries: [
      entry('cash', owed.amount),
      entry('dividends_receivable', negate(owed.amount), symbolId),
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
