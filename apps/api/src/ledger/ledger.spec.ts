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
  positions,
  replay,
  sell,
  withdrawal,
  type LedgerState,
  type LedgerTransaction,
  type Posting,
} from './ledger';

/** Applies postings in order, numbering them, and returns the history too. */
function run(build: ((state: LedgerState) => Posting)[]) {
  let state = EMPTY_LEDGER;
  const history: LedgerTransaction[] = [];
  for (const next of build) {
    const transaction = { seq: history.length + 1, ...next(state) };
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
    lots: [...state.lots.values()].flat().map((lot) => ({
      symbolId: lot.symbolId,
      openedSeq: lot.openedSeq,
      quantity: format(lot.quantity),
      cost: format(lot.cost),
    })),
  };
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
    expect(snapshot(state).lots).toEqual([
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
    };

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
);

/** The posting for an operation, or null when the ledger refuses it. */
function posting(state: LedgerState, op: Operation): Posting | null {
  try {
    if (op.type === 'deposit') return deposit(fromCents(op.cents));
    if (op.type === 'withdrawal') return withdrawal(state, fromCents(op.cents));

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
        const history: LedgerTransaction[] = [];

        for (const op of operations) {
          const next = posting(state, op);
          if (!next) continue;
          const transaction = { seq: history.length + 1, ...next };
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
          // (cash and shares at cost) is what was paid in, plus realized
          // gains, less fees.
          const assets = add(state.cash, costBasis);
          const claims = subtract(
            add(state.capital, state.realizedPnl),
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
