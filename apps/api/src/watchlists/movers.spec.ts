import { pickMovers } from './movers';

const close = (date: string, value: string, previousClose: string | null) => ({
  date,
  close: value,
  previousClose,
});

describe('pickMovers', () => {
  it('names the biggest gain and the biggest loss of the latest session', () => {
    const movers = pickMovers([
      { ticker: 'AAA', latestClose: close('2026-11-10', '101', '100') }, // +1%
      { ticker: 'BBB', latestClose: close('2026-11-10', '9.7', '10') }, // -3%
      { ticker: 'CCC', latestClose: close('2026-11-10', '52.5', '50') }, // +5%
      { ticker: 'DDD', latestClose: null },
    ]);

    expect(movers.best?.ticker).toBe('CCC');
    expect(movers.worst?.ticker).toBe('BBB');
    expect(movers.best?.latestClose).toEqual(close('2026-11-10', '52.5', '50'));
  });

  it('ranks by relative change, exactly, whatever the price scale', () => {
    // +0.0100001% beats +0.01%: a float comparison of nearby ratios is where
    // this would go wrong.
    const movers = pickMovers([
      { ticker: 'BIG', latestClose: close('2026-11-10', '1000.1', '1000') },
      { ticker: 'SMALL', latestClose: close('2026-11-10', '0.10001001', '0.1') },
    ]);

    expect(movers.best?.ticker).toBe('SMALL');
    expect(movers.worst?.ticker).toBe('BIG');
  });

  it('leaves out symbols whose last bar is older than the list’s newest', () => {
    const movers = pickMovers([
      { ticker: 'GONE', latestClose: close('2026-03-02', '1', '10') }, // -90%, months ago
      { ticker: 'AAA', latestClose: close('2026-11-10', '101', '100') },
      { ticker: 'BBB', latestClose: close('2026-11-10', '99', '100') },
    ]);

    expect(movers.best?.ticker).toBe('AAA');
    expect(movers.worst?.ticker).toBe('BBB');
  });

  it('never names one symbol twice, and breaks ties by list order', () => {
    expect(
      pickMovers([
        { ticker: 'ONLY', latestClose: close('2026-11-10', '101', '100') },
        { ticker: 'NEW', latestClose: close('2026-11-10', '5', null) },
        { ticker: 'ZERO', latestClose: close('2026-11-10', '5', '0') },
      ]),
    ).toEqual({
      best: { ticker: 'ONLY', latestClose: close('2026-11-10', '101', '100') },
      worst: null,
    });

    const tied = pickMovers([
      { ticker: 'FIRST', latestClose: close('2026-11-10', '11', '10') },
      { ticker: 'SECOND', latestClose: close('2026-11-10', '110', '100') },
    ]);
    expect(tied.best?.ticker).toBe('FIRST');
    expect(tied.worst).toBeNull();

    expect(pickMovers([])).toEqual({ best: null, worst: null });
  });
});
