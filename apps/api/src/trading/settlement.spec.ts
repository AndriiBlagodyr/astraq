import { format } from '../common/decimal';
import {
  EMPTY_LEDGER,
  apply,
  buy,
  deposit,
  positions,
  type LedgerState,
  type LedgerTransaction,
  type Posting,
} from '../ledger/ledger';
import {
  firstEligibleSession,
  isRegularSession,
  sessionDate,
  sessionOpen,
} from './market-hours';
import {
  cancel,
  place,
  settle,
  type Book,
  type CorporateAction,
  type OpenOrder,
  type Plan,
  type SessionBar,
} from './settlement';

// The first week of June 2026: Monday the 1st to Friday the 5th, New York
// on summer time (09:30 is 13:30 UTC, 16:00 is 20:00 UTC).
const MON = '2026-06-01';
const TUE = '2026-06-02';
const WED = '2026-06-03';
const THU = '2026-06-04';
const at = (date: string, utcTime: string) => new Date(`${date}T${utcTime}:00Z`);

const SYMBOL = 7;
const FREE = {
  slippageBps: 0,
  commissionPerOrder: '0',
  commissionPerShare: '0',
};

/** A ledger built from postings, each dated like the one before unless it says. */
function ledger(steps: [date: string, post: (state: LedgerState) => Posting][]) {
  let state = EMPTY_LEDGER;
  const history: LedgerTransaction[] = [];
  for (const [date, post] of steps) {
    const transaction = { seq: history.length + 1, date, ...post(state) };
    state = apply(state, transaction);
    history.push(transaction);
  }
  return history;
}

const funded = (cash: string) => ledger([[MON, () => deposit(cash)]]);
/** 10 shares bought on Monday for 12000. */
const holding = () =>
  ledger([
    [MON, () => deposit('20000')],
    [
      MON,
      (s) =>
        buy(s, {
          symbolId: SYMBOL,
          quantity: '10',
          notional: '12000.00',
          commission: '0',
        }),
    ],
  ]);

function book(parts: Partial<Book>): Book {
  return { history: [], orders: [], bars: [], actions: [], costs: FREE, ...parts };
}

function order(parts: Partial<OpenOrder>): OpenOrder {
  return {
    id: 'order-1',
    symbolId: SYMBOL,
    side: 'buy',
    type: 'market',
    quantity: '10',
    limitPrice: null,
    placedAt: at(MON, '21:00'),
    ...parts,
  };
}

const bar = (date: string, open: string, low = open, high = open): SessionBar => ({
  symbolId: SYMBOL,
  date,
  open,
  high,
  low,
  close: open,
});

const split: CorporateAction = {
  symbolId: SYMBOL,
  type: 'split',
  exDate: TUE,
  splitFrom: '1',
  splitTo: '10',
  cashAmount: null,
  payDate: null,
};

/** The book as the repository would read it back after writing the plan. */
function written(before: Book, plan: Plan): Book {
  const history = [...before.history];
  for (const { posting, occurredAt } of plan.postings) {
    history.push({
      seq: history.length + 1,
      date: sessionDate(occurredAt),
      ...posting,
    });
  }
  const gone = new Set([
    ...plan.closed.map((closed) => closed.orderId),
    ...plan.postings.map((planned) => planned.fill?.orderId),
  ]);
  return {
    ...before,
    history,
    orders: before.orders.filter((open) => !gone.has(open.id)),
  };
}

describe('market hours', () => {
  it('finds 09:30 New York in summer and in winter', () => {
    expect(sessionOpen('2026-06-01').toISOString()).toBe('2026-06-01T13:30:00.000Z');
    expect(sessionOpen('2026-01-05').toISOString()).toBe('2026-01-05T14:30:00.000Z');
  });

  it('lets an order see only a session that opened after it', () => {
    // Before the open: that day's bar. From the open on: the next day's.
    expect(firstEligibleSession(at(MON, '13:29'))).toBe(MON);
    expect(firstEligibleSession(at(MON, '13:30'))).toBe(TUE);
    // 01:00 UTC on Tuesday is still Monday evening in New York.
    expect(firstEligibleSession(at(TUE, '01:00'))).toBe(TUE);
  });

  it('knows the regular session, weekends included', () => {
    expect(isRegularSession(at(MON, '13:30'))).toBe(true);
    expect(isRegularSession(at(MON, '20:00'))).toBe(false);
    expect(isRegularSession(new Date('2026-06-06T15:00:00Z'))).toBe(false);
  });
});

describe('settle', () => {
  it('fills a resting market order at the next open, never on an earlier bar', () => {
    const before = book({
      history: funded('10000'),
      orders: [order({})], // placed Monday after the close
      bars: [bar(MON, '90'), bar(TUE, '100'), bar(WED, '110')],
    });

    const { plan, state } = settle(before, at(THU, '12:00'));

    expect(plan.postings).toHaveLength(1);
    expect(plan.postings[0]).toMatchObject({
      occurredAt: sessionOpen(TUE),
      fill: {
        orderId: 'order-1',
        rule: 'market_open',
        price: '100.000000',
        notional: '1000.00',
        sessionDate: TUE,
      },
    });
    expect(format(state.cash)).toBe('9000.00');

    // Written and read back, there is nothing left to do.
    const again = settle(written(before, plan), at(THU, '12:00'));
    expect(again.plan).toEqual({ postings: [], closed: [], placed: null });
  });

  it('keeps a limit order waiting until a session passes its limit', () => {
    const { plan } = settle(
      book({
        history: funded('10000'),
        orders: [order({ type: 'limit', limitPrice: '95' })],
        // Tuesday never trades below 95; Wednesday opens below it.
        bars: [bar(TUE, '100', '96', '101'), bar(WED, '94', '93', '97')],
      }),
      at(THU, '12:00'),
    );

    expect(plan.postings.map((planned) => planned.fill)).toMatchObject([
      { rule: 'limit_open', price: '94.000000', sessionDate: WED },
    ]);
  });

  it('rejects an order the ledger refuses at its fill', () => {
    const { plan, state } = settle(
      book({
        history: funded('500'),
        orders: [order({}), order({ id: 'order-2', side: 'sell', quantity: '1' })],
        bars: [bar(TUE, '100')],
      }),
      at(WED, '12:00'),
    );

    expect(plan.postings).toEqual([]);
    expect(plan.closed).toEqual([
      { orderId: 'order-1', status: 'rejected', reason: 'insufficient_cash', at: sessionOpen(TUE) },
      { orderId: 'order-2', status: 'rejected', reason: 'insufficient_shares', at: sessionOpen(TUE) },
    ]);
    expect(format(state.cash)).toBe('500.00');
  });

  it('applies a split to held shares and cancels orders from before it', () => {
    const before = book({
      history: holding(),
      orders: [
        order({ side: 'sell', type: 'limit', limitPrice: '1300' }),
        // Placed on the ex-date morning, in the new shares: it stays.
        order({ id: 'order-2', side: 'sell', type: 'limit', limitPrice: '130', placedAt: at(TUE, '12:00') }),
      ],
      actions: [split],
    });

    const { plan, state } = settle(before, at(TUE, '12:30'));

    expect(plan.postings).toHaveLength(1);
    expect(plan.postings[0]!.posting).toMatchObject({
      kind: 'split',
      split: { from: '1', to: '10' },
      entries: [{ account: 'securities', amount: '0.00', quantity: '90.000000' }],
    });
    expect(plan.closed).toEqual([
      { orderId: 'order-1', status: 'cancelled', reason: 'split', at: sessionOpen(TUE) },
    ]);
    // Ten times the shares at the same cost: at a tenth of the price the
    // position is worth what it was.
    const [position] = positions(state);
    expect(format(position!.quantity)).toBe('100.000000');
    expect(format(position!.cost)).toBe('12000.00');

    const again = settle(written(before, plan), at(WED, '12:00'));
    expect(again.plan).toEqual({ postings: [], closed: [], placed: null });
  });

  it('books a dividend on its ex-date and credits the cash on its pay date', () => {
    const before = book({
      history: holding(),
      actions: [
        {
          symbolId: SYMBOL,
          type: 'dividend',
          exDate: TUE,
          splitFrom: null,
          splitTo: null,
          cashAmount: '0.5',
          payDate: THU,
        },
      ],
    });

    const exDay = settle(before, at(WED, '12:00'));
    expect(exDay.plan.postings.map((planned) => planned.posting.kind)).toEqual(['dividend']);
    expect(format(exDay.state.receivable)).toBe('5.00');
    expect(format(exDay.state.cash)).toBe('8000.00');

    const payDay = settle(written(before, exDay.plan), at(THU, '12:00'));
    expect(payDay.plan.postings).toMatchObject([
      { posting: { kind: 'dividend_payment' }, occurredAt: sessionOpen(THU) },
    ]);
    expect(format(payDay.state.cash)).toBe('8005.00');
    expect(format(payDay.state.receivable)).toBe('0.00');

    // Looked at only after the pay date, both happen in one pass, in order.
    const late = settle(before, at('2026-06-05', '12:00'));
    expect(late.plan.postings.map((planned) => planned.posting.kind)).toEqual([
      'dividend',
      'dividend_payment',
    ]);
  });
});

describe('place', () => {
  const request = {
    symbolId: SYMBOL,
    side: 'sell' as const,
    type: 'market' as const,
    quantity: '100',
    limitPrice: null,
  };

  it('fills a market order placed in the session at the last close, in today’s shares', () => {
    // Tuesday is the ex-date of a 10-for-1 split; the last bar is Monday's,
    // priced in the old shares.
    const plan = place(
      book({ history: holding(), actions: [split] }),
      request,
      { date: MON, close: '1200' },
      at(TUE, '15:00'),
    );

    expect(plan.postings.map((planned) => planned.posting.kind)).toEqual(['split', 'sell']);
    expect(plan.postings[1]!.fill).toMatchObject({
      orderId: null,
      rule: 'market_last',
      price: '120.000000',
      notional: '12000.00',
      sessionDate: MON,
    });
    expect(plan.placed).toMatchObject({ status: 'filled', reason: null, closedAt: at(TUE, '15:00') });
  });

  it('records a rejected order when the ledger refuses the fill', () => {
    const plan = place(
      book({ history: funded('100') }),
      { ...request, side: 'buy', quantity: '1' },
      { date: MON, close: '1200' },
      at(TUE, '15:00'),
    );
    expect(plan.postings).toEqual([]);
    expect(plan.placed).toMatchObject({ status: 'rejected', reason: 'insufficient_cash' });
  });

  it('leaves an order open outside the session, and a limit order always', () => {
    const closed = place(book({ history: holding() }), request, { date: MON, close: '1200' }, at(MON, '21:00'));
    expect(closed.placed).toMatchObject({ status: 'open', closedAt: null });

    const limit = place(
      book({ history: holding() }),
      { ...request, type: 'limit', limitPrice: '1' },
      { date: MON, close: '1200' },
      at(TUE, '15:00'),
    );
    expect(limit.placed).toMatchObject({ status: 'open' });
    expect(limit.postings).toEqual([]);
  });
});

describe('cancel', () => {
  it('cancels an open order, but not one a stored bar has already filled', () => {
    const resting = book({ history: funded('10000'), orders: [order({})] });
    const done = cancel(resting, 'order-1', at(TUE, '12:00'));
    expect(done.cancelled).toBe(true);
    expect(done.plan.closed).toEqual([
      { orderId: 'order-1', status: 'cancelled', reason: 'user', at: at(TUE, '12:00') },
    ]);

    const filled = cancel({ ...resting, bars: [bar(TUE, '100')] }, 'order-1', at(WED, '12:00'));
    expect(filled.cancelled).toBe(false);
    expect(filled.plan.closed).toEqual([]);
    expect(filled.plan.postings).toHaveLength(1);
  });
});
