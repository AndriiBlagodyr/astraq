import { planRefresh, retryDelayMs } from './market-data.jobs';

describe('planRefresh', () => {
  const symbols = [
    // Stalest first, as the repository returns them.
    { ticker: 'OLD', lastBar: '2026-11-02' },
    { ticker: 'AAPL', lastBar: '2026-11-19' },
    { ticker: 'NVDA', lastBar: '2026-11-19' },
  ];

  it('cuts the symbols into batches, each reaching back past its stalest bar', () => {
    expect(planRefresh(symbols, '2026-11-20', 2, 5)).toEqual([
      // OLD missed two weeks: its batch starts five days before its last bar.
      { tickers: ['OLD', 'AAPL'], from: '2026-10-28', to: '2026-11-20' },
      { tickers: ['NVDA'], from: '2026-11-14', to: '2026-11-20' },
    ]);
  });

  it('looks back from `to` when every symbol is already there', () => {
    const fresh = [{ ticker: 'AAPL', lastBar: '2026-11-20' }];
    expect(planRefresh(fresh, '2026-11-20', 100, 90)).toEqual([
      { tickers: ['AAPL'], from: '2026-08-22', to: '2026-11-20' },
    ]);
    // A bar newer than `to` (a refresh of an older day) doesn't shrink it.
    expect(planRefresh(fresh, '2026-11-18', 100, 5)[0].from).toBe('2026-11-13');
  });

  it('plans nothing for no symbols', () => {
    expect(planRefresh([], '2026-11-20', 100, 5)).toEqual([]);
  });
});

describe('retryDelayMs', () => {
  const least = () => 0;
  const most = () => 1;

  it('doubles from 30 seconds and stops at 30 minutes', () => {
    expect([1, 2, 3, 4, 7, 20].map((n) => retryDelayMs(n, null, most))).toEqual(
      [30_000, 60_000, 120_000, 240_000, 1_800_000, 1_800_000],
    );
  });

  it('spreads the wait over the upper half', () => {
    expect(retryDelayMs(3, null, least)).toBe(60_000);
    expect(retryDelayMs(3, null, () => 0.5)).toBe(90_000);
  });

  it('waits at least as long as the provider asked', () => {
    expect(retryDelayMs(1, 90_000, most)).toBe(90_000);
    expect(retryDelayMs(4, 1_000, least)).toBe(120_000);
  });
});
