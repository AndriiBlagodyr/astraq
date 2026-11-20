import { ZERO, add, format, subtract } from '../common/decimal';
import {
  buy,
  deposit,
  dividend,
  replay,
  split,
  type LedgerTransaction,
  type Posting,
} from '../ledger/ledger';
import { equityCurve, type DailyClose, type EquityPoint } from './equity-curve';

const NVDA = 1;

/** A history built the way settlement builds one: each posting from the state before it. */
function ledger() {
  const history: LedgerTransaction[] = [];
  return {
    history,
    post(date: string, build: (state: ReturnType<typeof replay>) => Posting | null) {
      const posting = build(replay(history));
      if (!posting) throw new Error(`Nothing to post on ${date}`);
      history.push({ seq: history.length + 1, date, ...posting });
    },
  };
}

const closes = (rows: Record<string, string>): DailyClose[] =>
  Object.entries(rows).map(([date, close]) => ({ symbolId: NVDA, date, close }));

const read = (points: EquityPoint[]) =>
  points.map((point) => [
    point.date,
    point.equity && format(point.equity),
    format(point.capital),
    point.pnl && format(point.pnl),
  ]);

const tenForOne = { symbolId: NVDA, exDate: '2026-01-08', from: '1', to: '10' };

describe('equityCurve', () => {
  it('is empty for a portfolio without a ledger', () => {
    expect(equityCurve([], closes({ '2026-01-05': '100' }), [])).toEqual([]);
  });

  it('prices each evening and keeps cash paid in out of the day', () => {
    const book = ledger();
    book.post('2026-01-05', () => deposit('10000'));
    book.post('2026-01-06', (state) =>
      buy(state, { symbolId: NVDA, quantity: '10', notional: '1000.00', commission: '1.00' }),
    );
    book.post('2026-01-08', (state) => split(state, tenForOne));
    book.post('2026-01-09', () => deposit('500'));

    const points = equityCurve(
      book.history,
      closes({
        // Before the first transaction: no point of its own.
        '2026-01-02': '99',
        '2026-01-05': '100',
        '2026-01-06': '101',
        '2026-01-07': '105',
        '2026-01-08': '10.6',
        '2026-01-09': '10.5',
      }),
      [tenForOne],
    );

    expect(read(points)).toEqual([
      ['2026-01-05', '10000.00', '10000.00', '0.00'],
      // Bought at 100, closed at 101, less the commission.
      ['2026-01-06', '10009.00', '10000.00', '9.00'],
      ['2026-01-07', '10049.00', '10000.00', '40.00'],
      // Ten times the shares at a tenth of the price: the split is no loss.
      ['2026-01-08', '10059.00', '10000.00', '10.00'],
      // 500 arrived and the shares fell 10: the day lost 10.
      ['2026-01-09', '10549.00', '10500.00', '-10.00'],
    ]);

    // Every day's PnL together is what the portfolio has made.
    const last = points.at(-1)!;
    const made = points.reduce((sum, point) => add(sum, point.pnl!), ZERO);
    expect(format(made)).toBe(format(subtract(last.equity!, last.capital)));
  });

  it('brings the last close to the shares held on an ex-date without a bar', () => {
    const book = ledger();
    book.post('2026-01-05', () => deposit('10000'));
    book.post('2026-01-06', (state) =>
      buy(state, { symbolId: NVDA, quantity: '10', notional: '1000.00', commission: '0' }),
    );
    book.post('2026-01-08', (state) => split(state, tenForOne));

    const points = equityCurve(
      book.history,
      closes({ '2026-01-06': '100', '2026-01-07': '105' }),
      [tenForOne],
    );

    expect(read(points).at(-1)).toEqual(['2026-01-08', '10050.00', '10000.00', '0.00']);
  });

  it('counts dividends owed, and a late booking from the day before it', () => {
    const book = ledger();
    book.post('2026-01-05', () => deposit('10000'));
    book.post('2026-01-06', (state) =>
      buy(state, { symbolId: NVDA, quantity: '10', notional: '1000.00', commission: '0' }),
    );
    book.post('2026-01-09', () => deposit('1'));
    // Loaded after the fact: dated the 7th, booked after the 9th.
    book.post('2026-01-07', (state) =>
      dividend(state, { symbolId: NVDA, exDate: '2026-01-07', cashPerShare: '0.5' }),
    );

    const points = equityCurve(
      book.history,
      closes({ '2026-01-06': '100', '2026-01-07': '100', '2026-01-09': '100' }),
      [],
    );

    expect(read(points)).toEqual([
      ['2026-01-05', '10000.00', '10000.00', '0.00'],
      ['2026-01-06', '10000.00', '10000.00', '0.00'],
      ['2026-01-07', '10000.00', '10000.00', '0.00'],
      ['2026-01-09', '10006.00', '10001.00', '5.00'],
    ]);
  });

  it('has no equity while a share held has no close', () => {
    const book = ledger();
    book.post('2026-01-05', () => deposit('10000'));
    book.post('2026-01-06', (state) =>
      buy(state, { symbolId: NVDA, quantity: '10', notional: '1000.00', commission: '0' }),
    );

    const points = equityCurve(book.history, closes({ '2026-01-07': '110' }), []);

    expect(read(points)).toEqual([
      ['2026-01-05', '10000.00', '10000.00', '0.00'],
      ['2026-01-06', null, '10000.00', null],
      ['2026-01-07', '10100.00', '10000.00', null],
    ]);
  });
});
