import fc from 'fast-check';
import {
  ZERO,
  add,
  decimal,
  divide,
  format,
  multiply,
  round,
  sign,
  subtract,
} from '../common/decimal';
import {
  EMPTY_LEDGER,
  LedgerError,
  apply,
  buy,
  deposit,
  dividend,
  dividendPayment,
  positions,
  replay,
  sell,
  split,
  withdrawal,
  type LedgerState,
  type LedgerTransaction,
  type Posting,
} from './ledger';

type Build = (state: LedgerState) => Posting;

/**
 * Applies postings in order, numbering them, and returns the history too.
 * A step is dated like the one before it unless it names its own session.
 */
function run(steps: (Build | { on: string; post: Build })[]) {
  let state = EMPTY_LEDGER;
  let date = '2026-01-05';
  const history: LedgerTransaction[] = [];
  for (const step of steps) {
    const next = typeof step === 'function' ? step : step.post;
    if (typeof step !== 'function') date = step.on;
    const transaction = { seq: history.length + 1, date, ...next(state) };
    state = apply(state, transaction);
    history.push(transaction);
  }
  return { state, history };
}

/** A state as plain strings, for comparing two of them. */
function snapshot(state: LedgerState) {
  return {
    cash: format(state.cash),
    capital: format(state.capital),
    fees: format(state.fees),
    realizedPnl: format(state.realizedPnl),
    dividendIncome: format(state.dividendIncome),
    receivable: format(state.receivable),
    lots: lotsOf(state),
    dividends: state.dividends.map((booked) => ({
      ...booked,
      amount: format(booked.amount),
    })),
  };
}

function lotsOf(state: LedgerState) {
  return [...state.lots.values()].flat().map((lot) => ({
    symbolId: lot.symbolId,
    openedSeq: lot.openedSeq,
    quantity: format(lot.quantity),
    cost: format(lot.cost),
  }));
}

const trade = (symbolId: number, quantity: string, notional: string) => ({
  symbolId,
  quantity,
  notional,
  commission: '0',
});

describe('ledger (worked examples)', () => {
  it('sells the oldest lot first and realizes the difference', () => {
    const { state } = run([
      () => deposit('1000'),
      (s) => buy(s, trade(1, '10', '100.00')), // 10 @ 10
      (s) => buy(s, trade(1, '10', '120.00')), // 10 @ 12
      (s) => sell(s, { ...trade(1, '15', '225.00'), commission: '1.00' }), // 15 @ 15
    ]);

    // Cost by FIFO: all of the first lot (100) and half of the second (60).
    expect(format(state.realizedPnl)).toBe('65.00');
    expect(format(state.fees)).toBe('1.00');
    expect(format(state.cash)).toBe('1004.00'); // 1000 - 220 + 225 - 1
    expect(lotsOf(state)).toEqual([
      { symbolId: 1, openedSeq: 3, quantity: '5.000000', cost: '60.00' },
    ]);
  });

  it('hands out the cents of a lot exactly once across partial sells', () => {
    // 3 shares for 10.00: a third is 3.33, and 3 × 3.33 loses a cent.
    const { state, history } = run([
      () => deposit('10'),
      (s) => buy(s, trade(1, '3', '10.00')),
      (s) => sell(s, trade(1, '1', '4.00')),
      (s) => sell(s, trade(1, '1', '4.00')),
      (s) => sell(s, trade(1, '1', '4.00')),
    ]);

    const costs = history
      .slice(2)
      .map((t) => t.entries.find((e) => e.account === 'securities')!.amount);
    expect(costs).toEqual(['-3.33', '-3.34', '-3.33']);
    expect(format(state.realizedPnl)).toBe('2.00');
    expect(state.lots.size).toBe(0);
  });

  it('refuses to spend cash or sell shares the portfolio lacks', () => {
    const { state } = run([
      () => deposit('100'),
      (s) => buy(s, trade(1, '1', '60.00')),
    ]);

    const code = (action: () => unknown) => {
      try {
        action();
      } catch (error) {
        return error instanceof LedgerError ? error.code : error;
      }
      return 'no error';
    };
    expect(code(() => buy(state, trade(2, '1', '40.01')))).toBe(
      'insufficient_cash',
    );
    expect(code(() => withdrawal(state, '40.01'))).toBe('insufficient_cash');
    expect(code(() => sell(state, trade(1, '1.000001', '70.00')))).toBe(
      'insufficient_shares',
    );
    expect(code(() => sell(state, trade(2, '1', '70.00')))).toBe(
      'insufficient_shares',
    );
  });

  it('replay rejects a history whose sell was edited', () => {
    const { history } = run([
      () => deposit('1000'),
      (s) => buy(s, trade(1, '10', '100.00')),
      (s) => sell(s, trade(1, '4', '80.00')),
    ]);
    expect(() => replay(history)).not.toThrow();

    // Understate the cost by 10 and overstate the gain to match: still
    // balanced, but not what FIFO gives.
    const forged = structuredClone(history);
    const entries = forged[2]!.entries;
    entries.find((e) => e.account === 'securities')!.amount = '-30.00';
    entries.find((e) => e.account === 'realized_pnl')!.amount = '-50.00';
    expect(() => replay(forged)).toThrow(/cost 40\.00 by FIFO/);
  });

  it('a split changes the share count and nothing else', () => {
    // NVDA, June 2024: 10 shares at 1200, then 10 new shares for each old one.
    const nvda = { symbolId: 1, exDate: '2024-06-10', from: '1', to: '10' };
    const { state, history } = run([
      { on: '2024-06-07', post: () => deposit('20000') },
      (s) => buy(s, trade(1, '10', '12000.00')),
      { on: '2024-06-10', post: (s) => split(s, nvda)! },
      // Bought on the ex-date, so already in the new shares.
      (s) => buy(s, trade(1, '5', '600.00')),
    ]);

    expect(lotsOf(state)).toEqual([
      { symbolId: 1, openedSeq: 2, quantity: '100.000000', cost: '12000.00' },
      { symbolId: 1, openedSeq: 4, quantity: '5.000000', cost: '600.00' },
    ]);
    expect(format(state.cash)).toBe('7400.00');
    // Market value before and after: 10 at 1200 is 100 at 120 (ROADMAP
    // Phase 3 exit criterion).
    const before = multiply(decimal('10'), decimal('1200'));
    const after = multiply(decimal('100'), decimal('120'));
    expect(format(round(before, 2))).toBe(format(round(after, 2)));

    // Every lot is now in the new shares: the same split has nothing to do.
    expect(split(state, nvda)).toBeNull();

    // A reverse split takes shares, and a fraction of one is kept.
    const reverse = split(state, {
      symbolId: 1,
      exDate: '2024-07-01',
      from: '8',
      to: '1',
    })!;
    expect(reverse.entries[0]).toMatchObject({
      amount: '0.00',
      quantity: '-91.875000',
    });

    // Replay redoes the split from its ratio and refuses a different count.
    const forged = structuredClone(history);
    forged[2]!.entries[0]!.quantity = '100.000000';
    expect(() => replay(forged)).toThrow(/the split adds 90\.000000 shares/);
  });

  it('books a dividend on the ex-date and pays it later, once', () => {
    const payout = { symbolId: 1, exDate: '2026-02-10', cashPerShare: '0.25' };
    const { state } = run([
      { on: '2026-02-09', post: () => deposit('1000') },
      (s) => buy(s, trade(1, '10', '100.00')),
      // Bought on the ex-date: no dividend for these.
      { on: '2026-02-10', post: (s) => buy(s, trade(1, '4', '40.00')) },
      (s) => dividend(s, payout)!,
    ]);

    // Income on the ex-date, cash not yet.
    expect(format(state.dividendIncome)).toBe('2.50');
    expect(format(state.receivable)).toBe('2.50');
    expect(format(state.cash)).toBe('860.00');
    expect(dividend(state, payout)).toBeNull();

    const paid = apply(state, {
      seq: 5,
      date: '2026-02-20',
      ...dividendPayment(state, 1)!,
    });
    expect(format(paid.cash)).toBe('862.50');
    expect(format(paid.receivable)).toBe('0.00');
    expect(format(paid.dividendIncome)).toBe('2.50');
    expect(dividendPayment(paid, 1)).toBeNull();
  });
});

// ROADMAP Phase 3 exit criteria, as properties over random histories.
type Operation =
  | { type: 'deposit'; cents: number }
  | { type: 'withdrawal'; cents: number }
  | {
      type: 'buy';
      symbolId: number;
      microShares: number;
      priceCents: number;
      commissionCents: number;
    }
  | {
      type: 'sell';
      symbolId: number;
      percent: number;
      priceCents: number;
      commissionCents: number;
    }
  // The two below happen on a new day, so earlier lots are "from before".
  | { type: 'split'; symbolId: number; from: number; to: number }
  | { type: 'dividend'; symbolId: number; rateCents: number }
  | { type: 'payment'; symbolId: number };

const fromCents = (value: number) => format({ digits: BigInt(value), scale: 2 });
const symbolId = fc.integer({ min: 1, max: 3 });
const priceCents = fc.integer({ min: 1, max: 500_000 });
const commissionCents = fc.integer({ min: 0, max: 500 });

const operation: fc.Arbitrary<Operation> = fc.oneof(
  fc.record({
    type: fc.constant('deposit' as const),
    cents: fc.integer({ min: 1, max: 10_000_000 }),
  }),
  fc.record({
    type: fc.constant('withdrawal' as const),
    cents: fc.integer({ min: 1, max: 1_000_000 }),
  }),
  fc.record({
    type: fc.constant('buy' as const),
    symbolId,
    // Down to a millionth of a share, up to 500 shares.
    microShares: fc.integer({ min: 1, max: 500_000_000 }),
    priceCents,
    commissionCents,
  }),
  fc.record({
    type: fc.constant('sell' as const),
    symbolId,
    // A share of what's held, so sells usually have something to sell.
    percent: fc.integer({ min: 1, max: 100 }),
    priceCents,
    commissionCents,
  }),
  fc.record({
    type: fc.constant('split' as const),
    symbolId,
    from: fc.integer({ min: 1, max: 12 }),
    to: fc.integer({ min: 1, max: 12 }),
  }),
  fc.record({
    type: fc.constant('dividend' as const),
    symbolId,
    rateCents: fc.integer({ min: 1, max: 2_000 }),
  }),
  fc.record({ type: fc.constant('payment' as const), symbolId }),
);

/** Day `n` of the history as a session date. */
const day = (n: number) =>
  new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10);

/** The posting for an operation, or null when there is nothing to post. */
function posting(
  state: LedgerState,
  op: Operation,
  date: string,
): Posting | null {
  try {
    if (op.type === 'deposit') return deposit(fromCents(op.cents));
    if (op.type === 'withdrawal') return withdrawal(state, fromCents(op.cents));
    if (op.type === 'payment') return dividendPayment(state, op.symbolId);
    if (op.type === 'split') {
      return split(state, {
        symbolId: op.symbolId,
        exDate: date,
        from: String(op.from),
        to: String(op.to),
      });
    }
    if (op.type === 'dividend') {
      return dividend(state, {
        symbolId: op.symbolId,
        exDate: date,
        cashPerShare: fromCents(op.rateCents),
      });
    }

    const price = { digits: BigInt(op.priceCents), scale: 2 };
    const commission = fromCents(op.commissionCents);
    if (op.type === 'buy') {
      const quantity = { digits: BigInt(op.microShares), scale: 6 };
      return buy(state, {
        symbolId: op.symbolId,
        quantity: format(quantity),
        notional: format(round(multiply(quantity, price), 2)),
        commission,
      });
    }

    const held = positions(state).find((p) => p.symbolId === op.symbolId);
    if (!held) return null;
    const quantity = divide(
      multiply(held.quantity, decimal(String(op.percent))),
      decimal('100'),
      6,
      op.percent === 100 ? 'half-up' : 'floor',
    );
    return sell(state, {
      symbolId: op.symbolId,
      quantity: format(quantity),
      notional: format(round(multiply(quantity, price), 2)),
      commission,
    });
  } catch (error) {
    if (error instanceof LedgerError && error.code !== 'inconsistent') {
      return null;
    }
    throw error;
  }
}

describe('ledger (properties)', () => {
  it('keeps the books balanced, never goes negative, and replays to the same state', () => {
    fc.assert(
      fc.property(fc.array(operation, { maxLength: 60 }), (operations) => {
        let state = EMPTY_LEDGER;
        let today = 0;
        const history: LedgerTransaction[] = [];

        for (const op of operations) {
          if (op.type === 'split' || op.type === 'dividend') today += 1;
          const date = day(today);
          const next = posting(state, op, date);
          if (!next) continue;
          const transaction = { seq: history.length + 1, date, ...next };
          state = apply(state, transaction);
          history.push(transaction);

          // No negative cash, and no short or empty positions.
          expect(sign(state.cash)).toBeGreaterThanOrEqual(0);
          let costBasis = ZERO;
          for (const position of positions(state)) {
            expect(sign(position.quantity)).toBe(1);
            expect(sign(position.cost)).toBeGreaterThanOrEqual(0);
            costBasis = add(costBasis, position.cost);
          }

          // The accounting identity, to the cent: what the portfolio holds
          // (cash, shares at cost, and dividends owed to it) is what was
          // paid in, plus realized gains and dividends, less fees. A split
          // moves no money, so it can never disturb it.
          expect(sign(state.receivable)).toBeGreaterThanOrEqual(0);
          const assets = add(add(state.cash, costBasis), state.receivable);
          const claims = subtract(
            add(add(state.capital, state.realizedPnl), state.dividendIncome),
            state.fees,
          );
          expect(format(assets)).toBe(format(round(claims, 2)));
        }

        // The stored entries alone rebuild the state.
        expect(snapshot(replay(history))).toEqual(snapshot(state));
      }),
    );
  });
});
