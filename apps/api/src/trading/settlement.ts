import {
  PRICE_PLACES,
  decimal,
  divide,
  format,
  multiply,
  sign,
} from '../common/decimal';
import {
  LedgerError,
  apply,
  buy,
  deposit,
  dividend,
  dividendPayment,
  oldestUnpaidDividend,
  replay,
  sell,
  split,
  withdrawal,
  type LedgerErrorCode,
  type LedgerState,
  type LedgerTransaction,
  type Posting,
} from '../ledger/ledger';
import {
  fillAtLastPrice,
  fillOnBar,
  type Fill,
  type FillBar,
  type FillCosts,
  type FillOrder,
} from './fill-model';
import {
  firstEligibleSession,
  isRegularSession,
  sessionDate,
  sessionOpen,
} from './market-hours';

// What happens to a portfolio between two looks at it (ROADMAP Phase 3
// items 3 and 4, ADR 0009 section 7), as pure functions. Given the ledger,
// the open orders, and the market data that has arrived, `settle` walks the
// sessions in order and decides what to write: splits on held shares,
// dividends going ex and being paid, and orders meeting the bars that fill
// them. `place`, `cancel`, and `transfer` settle first, then add their own
// step: whatever a portfolio's owner does today meets books in which
// everything earlier has already happened.
//
// Nothing here reads a clock or a database. The repository loads a `Book`
// under the portfolio's row lock, calls one of these, and writes the `Plan`
// in the same database transaction. Settling twice writes nothing the
// second time: every step leaves the state it would otherwise act on.

/** An order waiting to fill. */
export interface OpenOrder extends FillOrder {
  id: string;
  symbolId: number;
  placedAt: Date;
}

/** One session's raw bar for a symbol. `date` is the session, YYYY-MM-DD. */
export interface SessionBar extends FillBar {
  symbolId: number;
  date: string;
}

/** A row of `corporate_actions`, with its numbers as decimal strings. */
export interface CorporateAction {
  symbolId: number;
  type: 'split' | 'dividend';
  exDate: string;
  splitFrom: string | null;
  splitTo: string | null;
  /** Dividend: cash per share. */
  cashAmount: string | null;
  /** Dividend: when the cash is paid; null means on the ex-date. */
  payDate: string | null;
}

/** Everything a decision is made from, read under the portfolio's lock. */
export interface Book {
  history: LedgerTransaction[];
  orders: OpenOrder[];
  /** Bars the open orders may fill on. */
  bars: SessionBar[];
  /** Splits and dividends of every symbol the portfolio holds or has an order for. */
  actions: CorporateAction[];
  costs: FillCosts;
}

/** Why an order ended without a fill. */
export type CloseReason =
  | 'user'
  | 'split'
  | 'insufficient_cash'
  | 'insufficient_shares'
  | 'too_small';

export interface PlannedFill extends Fill {
  /** The order that filled; null for the order being placed, which has no id yet. */
  orderId: string | null;
  quantity: string;
  /** The session whose bar priced the fill. */
  sessionDate: string;
}

/** A ledger transaction to append, with the fill it books (if any). */
export interface PlannedPosting {
  posting: Posting;
  occurredAt: Date;
  fill: PlannedFill | null;
}

/** An open order that ends without a fill. */
export interface ClosedOrder {
  orderId: string;
  status: 'cancelled' | 'rejected';
  reason: CloseReason;
  at: Date;
}

/** A new order and how it starts. A filled one has a posting with `orderId: null`. */
export interface PlacedOrder extends FillOrder {
  symbolId: number;
  placedAt: Date;
  status: 'open' | 'filled' | 'rejected';
  reason: CloseReason | null;
  closedAt: Date | null;
}

/** What to write, in order: postings take the next `seq` values as listed. */
export interface Plan {
  postings: PlannedPosting[];
  closed: ClosedOrder[];
  placed: PlacedOrder | null;
}

/** An order as the client asks for it. */
export interface OrderRequest extends FillOrder {
  symbolId: number;
}

/** Cash paid in or taken out, as the client asks for it. */
export interface CashTransfer {
  type: 'deposit' | 'withdrawal';
  amount: string;
}

/** The symbol's latest stored session. */
export interface LastBar {
  date: string;
  close: string;
}

const REJECTIONS: Partial<Record<LedgerErrorCode, CloseReason>> = {
  insufficient_cash: 'insufficient_cash',
  insufficient_shares: 'insufficient_shares',
  // The fill's notional rounded to zero cents.
  invalid_amount: 'too_small',
};

const isPositive = (value: string | null): value is string => {
  try {
    return value !== null && sign(decimal(value)) > 0;
  } catch {
    return false;
  }
};

/** The fill model's answer, or null when the prices can't be used (a zero open). */
function attempt(fill: () => Fill | null): Fill | null {
  try {
    return fill();
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

/** A settlement in progress: the state so far and what has been decided. */
class Run {
  state: LedgerState;
  open: OpenOrder[];
  readonly postings: PlannedPosting[] = [];
  readonly closed: ClosedOrder[] = [];
  private seq: number;

  constructor(book: Book) {
    this.state = replay(book.history);
    this.seq = book.history.length;
    this.open = [...book.orders].sort(
      (a, b) => a.placedAt.getTime() - b.placedAt.getTime(),
    );
  }

  /** Appends a posting and moves the state past it, with replay's own audit. */
  post(posting: Posting, occurredAt: Date, fill: PlannedFill | null = null) {
    this.seq += 1;
    this.state = apply(this.state, {
      seq: this.seq,
      date: sessionDate(occurredAt),
      ...posting,
    });
    this.postings.push({ posting, occurredAt, fill });
  }

  /**
   * Books a fill, or returns why the ledger refused it: the guards against
   * buying on credit and selling short live there (ADR 0009).
   */
  record(
    order: OrderRequest,
    orderId: string | null,
    fill: Fill,
    occurredAt: Date,
    barDate: string,
  ): CloseReason | null {
    const trade = {
      symbolId: order.symbolId,
      quantity: order.quantity,
      notional: fill.notional,
      commission: fill.commission,
    };
    let posting: Posting;
    try {
      posting =
        order.side === 'buy' ? buy(this.state, trade) : sell(this.state, trade);
    } catch (error) {
      const reason =
        error instanceof LedgerError ? REJECTIONS[error.code] : undefined;
      if (reason === undefined) throw error;
      return reason;
    }
    this.post(posting, occurredAt, {
      ...fill,
      orderId,
      quantity: order.quantity,
      sessionDate: barDate,
    });
    return null;
  }

  close(order: OpenOrder, status: ClosedOrder['status'], reason: CloseReason, at: Date) {
    this.closed.push({ orderId: order.id, status, reason, at });
    this.open = this.open.filter((other) => other.id !== order.id);
  }

  plan(placed: PlacedOrder | null = null): Plan {
    return { postings: this.postings, closed: this.closed, placed };
  }
}

/**
 * Walks the sessions up to today in date order. Within one session:
 *
 * 1. Splits going ex. Lots still counted in the old shares are converted,
 *    and orders placed before the ex-date are cancelled: their quantity and
 *    limit were in the old shares.
 * 2. Dividends going ex: shares bought before the day earn it, as a
 *    receivable.
 * 3. Dividends whose pay date has come: the receivable becomes cash.
 * 4. Open orders against the session's bar, oldest order first. An order
 *    only sees a session that opened after it was placed (ADR 0008). The
 *    ledger refusing the fill rejects the order.
 *
 * The order matters: a dividend counts post-split shares, and a fill on an
 * ex-date bar meets lots already converted to that bar's prices.
 */
function run(book: Book, now: Date): Run {
  const settlement = new Run(book);
  const today = sessionDate(now);

  const splits = book.actions.filter(
    (action) =>
      action.type === 'split' &&
      action.exDate <= today &&
      isPositive(action.splitFrom) &&
      isPositive(action.splitTo),
  );
  const dividends = book.actions.filter(
    (action) =>
      action.type === 'dividend' &&
      action.exDate <= today &&
      isPositive(action.cashAmount),
  );
  // A dividend is paid on its pay date, never before its ex-date. One whose
  // corporate action has since been withdrawn is paid on the ex-date.
  const payDates = new Map(
    dividends.map((action) => [
      `${action.symbolId}:${action.exDate}`,
      action.payDate !== null && action.payDate > action.exDate
        ? action.payDate
        : action.exDate,
    ]),
  );
  const dueDate = (symbolId: number, exDate: string) =>
    payDates.get(`${symbolId}:${exDate}`) ?? exDate;

  const bars = new Map(
    book.bars.map((bar) => [`${bar.symbolId}:${bar.date}`, bar]),
  );
  const eligibleFrom = new Map(
    book.orders.map((order) => [order.id, firstEligibleSession(order.placedAt)]),
  );

  const dates = [
    ...new Set([
      ...splits.map((action) => action.exDate),
      ...dividends.map((action) => action.exDate),
      ...[...payDates.values()].filter((date) => date <= today),
      ...book.bars.map((bar) => bar.date).filter((date) => date <= today),
      today,
    ]),
  ].sort();

  for (const date of dates) {
    const open = sessionOpen(date);

    for (const action of splits) {
      if (action.exDate !== date) continue;
      const posting = split(settlement.state, {
        symbolId: action.symbolId,
        exDate: date,
        from: action.splitFrom!,
        to: action.splitTo!,
      });
      if (posting) settlement.post(posting, open);
      for (const order of settlement.open) {
        if (
          order.symbolId === action.symbolId &&
          sessionDate(order.placedAt) < date
        ) {
          settlement.close(order, 'cancelled', 'split', open);
        }
      }
    }

    for (const action of dividends) {
      if (action.exDate !== date) continue;
      const posting = dividend(settlement.state, {
        symbolId: action.symbolId,
        exDate: date,
        cashPerShare: action.cashAmount!,
      });
      if (posting) settlement.post(posting, open);
    }

    const owing = new Set(
      settlement.state.dividends
        .filter((booked) => !booked.paid)
        .map((booked) => booked.symbolId),
    );
    for (const symbolId of owing) {
      // Oldest first, and each in full: that's the order the ledger pays in.
      for (;;) {
        const owed = oldestUnpaidDividend(settlement.state, symbolId);
        if (!owed) break;
        const due = dueDate(symbolId, owed.exDate);
        if (due > date) break;
        settlement.post(dividendPayment(settlement.state, symbolId)!, sessionOpen(due));
      }
    }

    for (const order of settlement.open) {
      const bar = bars.get(`${order.symbolId}:${date}`);
      if (!bar || date < eligibleFrom.get(order.id)!) continue;
      const fill = attempt(() => fillOnBar(order, bar, book.costs));
      if (!fill) continue;
      const refused = settlement.record(order, order.id, fill, open, date);
      if (refused) settlement.close(order, 'rejected', refused, open);
      else settlement.open = settlement.open.filter((o) => o.id !== order.id);
    }
  }

  return settlement;
}

/** Everything that has become due on the portfolio, and the state after it. */
export function settle(
  book: Book,
  now: Date,
): { plan: Plan; state: LedgerState } {
  const settlement = run(book, now);
  return { plan: settlement.plan(), state: settlement.state };
}

/**
 * The latest close in the shares that trade today: divided by every split
 * that went ex after that bar. Without this, a market order on an ex-date
 * would fill at the pre-split price against post-split shares.
 */
function lastPriceToday(
  bar: LastBar,
  actions: CorporateAction[],
  symbolId: number,
  today: string,
): string {
  let price = decimal(bar.close);
  for (const action of actions) {
    if (
      action.symbolId === symbolId &&
      action.type === 'split' &&
      action.exDate > bar.date &&
      action.exDate <= today &&
      isPositive(action.splitFrom) &&
      isPositive(action.splitTo)
    ) {
      price = divide(
        multiply(price, decimal(action.splitFrom)),
        decimal(action.splitTo),
        PRICE_PLACES,
      );
    }
  }
  return format(price);
}

/**
 * Settles, then places a new order. A market order placed during the
 * session fills at once at the latest known price (ADR 0008's
 * `market_last`); if the ledger refuses that fill the order is recorded as
 * rejected. Every other order starts open and waits for a bar.
 *
 * `lastBar` is the symbol's latest stored session, or null without any.
 */
export function place(
  book: Book,
  request: OrderRequest,
  lastBar: LastBar | null,
  now: Date,
): Plan {
  const settlement = run(book, now);
  const placed: PlacedOrder = {
    ...request,
    placedAt: now,
    status: 'open',
    reason: null,
    closedAt: null,
  };

  if (request.type === 'market' && lastBar && isRegularSession(now)) {
    const price = lastPriceToday(
      lastBar,
      book.actions,
      request.symbolId,
      sessionDate(now),
    );
    const fill = attempt(() => fillAtLastPrice(request, price, book.costs));
    if (fill) {
      const refused = settlement.record(request, null, fill, now, lastBar.date);
      placed.status = refused ? 'rejected' : 'filled';
      placed.reason = refused;
      placed.closedAt = now;
    }
  }
  return settlement.plan(placed);
}

/**
 * Settles, then cancels the order if it is still open. Settling first is
 * what makes a cancel honest: an order that a stored bar already filled is
 * filled, and can't be taken back.
 */
export function cancel(
  book: Book,
  orderId: string,
  now: Date,
): { plan: Plan; cancelled: boolean } {
  const settlement = run(book, now);
  const order = settlement.open.find((open) => open.id === orderId);
  if (order) settlement.close(order, 'cancelled', 'user', now);
  return { plan: settlement.plan(), cancelled: order !== undefined };
}

/**
 * Settles, then pays cash in or takes it out. Settling first keeps the
 * order of events honest: a deposit made today can't pay for an order that
 * met its bar yesterday, and a withdrawal can't take cash a fill has
 * already spent. Throws the ledger's `insufficient_cash` for a withdrawal
 * the settled cash doesn't cover.
 */
export function transfer(
  book: Book,
  request: CashTransfer,
  now: Date,
): { plan: Plan; state: LedgerState } {
  const settlement = run(book, now);
  settlement.post(
    request.type === 'deposit'
      ? deposit(request.amount)
      : withdrawal(settlement.state, request.amount),
    now,
  );
  return { plan: settlement.plan(), state: settlement.state };
}
