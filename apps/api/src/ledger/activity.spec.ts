import { format } from '../common/decimal';
import { timeline, type RecordedTransaction } from './activity';
import {
  EMPTY_LEDGER,
  apply,
  buy,
  deposit,
  dividend,
  dividendPayment,
  sell,
  split,
  withdrawal,
  type LedgerState,
  type Posting,
} from './ledger';

const AAPL = 7;

type Step = {
  on: string;
  post: (state: LedgerState) => Posting;
  fill?: RecordedTransaction['fill'];
};

/** Builds a history with the ledger's own builders, so every line is one `replay` accepts. */
function record(steps: Step[]) {
  let state = EMPTY_LEDGER;
  const history: RecordedTransaction[] = [];
  for (const step of steps) {
    const transaction: RecordedTransaction = {
      seq: history.length + 1,
      date: step.on,
      occurredAt: new Date(`${step.on}T14:30:00Z`),
      fill: step.fill ?? null,
      ...step.post(state),
    };
    state = apply(state, transaction);
    history.push(transaction);
  }
  return { state, history };
}

describe('timeline', () => {
  const { state, history } = record([
    { on: '2026-01-05', post: () => deposit('10000') },
    {
      on: '2026-01-05',
      post: (s) =>
        buy(s, { symbolId: AAPL, quantity: '10', notional: '1500.00', commission: '1.00' }),
      fill: { orderId: 'order-1', price: '150' },
    },
    { on: '2026-02-02', post: (s) => split(s, { symbolId: AAPL, exDate: '2026-02-02', from: '1', to: '4' })! },
    { on: '2026-02-09', post: (s) => dividend(s, { symbolId: AAPL, exDate: '2026-02-09', cashPerShare: '0.25' })! },
    { on: '2026-02-16', post: (s) => dividendPayment(s, AAPL)! },
    {
      on: '2026-03-02',
      post: (s) =>
        sell(s, { symbolId: AAPL, quantity: '20', notional: '900.00', commission: '1.00' }),
      fill: { orderId: 'order-2', price: '45' },
    },
    { on: '2026-03-03', post: (s) => withdrawal(s, '500') },
  ]);
  const lines = timeline(history);

  it('says what each transaction was and what it did to cash', () => {
    expect(
      lines.map(({ kind, quantity, cashChange, cashAfter }) => ({
        kind,
        quantity,
        cashChange,
        cashAfter,
      })),
    ).toEqual([
      { kind: 'deposit', quantity: null, cashChange: '10000.00', cashAfter: '10000.00' },
      { kind: 'buy', quantity: '10.000000', cashChange: '-1501.00', cashAfter: '8499.00' },
      { kind: 'split', quantity: '30.000000', cashChange: '0.00', cashAfter: '8499.00' },
      { kind: 'dividend', quantity: null, cashChange: '0.00', cashAfter: '8499.00' },
      { kind: 'dividend_payment', quantity: null, cashChange: '10.00', cashAfter: '8509.00' },
      { kind: 'sell', quantity: '-20.000000', cashChange: '899.00', cashAfter: '9408.00' },
      { kind: 'withdrawal', quantity: null, cashChange: '-500.00', cashAfter: '8908.00' },
    ]);
  });

  it('ends on the cash the ledger replays to', () => {
    expect(lines.at(-1)!.cashAfter).toBe(format(state.cash));
  });

  it('carries a fill, its commission, and a sell\'s realized PnL', () => {
    const [, bought, , , , sold] = lines;
    expect(bought).toMatchObject({
      symbolId: AAPL,
      price: '150',
      orderId: 'order-1',
      commission: '1.00',
      realizedPnl: null,
    });
    // 20 of 40 post-split shares cost half of 1500.00.
    expect(sold).toMatchObject({
      price: '45',
      orderId: 'order-2',
      commission: '1.00',
      realizedPnl: '150.00',
    });
  });

  it('names a split by its ratio and a dividend by its amount, earned and paid', () => {
    const [deposited, , splitLine, earned, paid] = lines;
    expect(deposited).toMatchObject({ symbolId: null, split: null, dividend: null });
    expect(splitLine).toMatchObject({ symbolId: AAPL, split: { from: '1', to: '4' } });
    expect(earned).toMatchObject({ symbolId: AAPL, dividend: '10.00' });
    expect(paid).toMatchObject({ symbolId: AAPL, dividend: '10.00' });
  });
});
