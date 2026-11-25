import { PrismaService } from '../database/prisma.service';
import { MarketDataRepository } from '../market-data/market-data.repository';
import { CandlesRepository } from './candles.repository';

// Runs the adjustment SQL against real Postgres + TimescaleDB with the
// migrations applied (`pnpm --filter @astraq/api test:integration`). Test
// symbols get an ITEST_ prefix so they never collide with loaded data.

const NVDA = 'ITEST_NVDA';
const DIV = 'ITEST_DIV';
const TICKERS = [NVDA, DIV, 'ITEST_EMPTY', 'ITEST_ONE'];

const bar = (
  ts: string,
  [open, high, low, close]: string[],
  volume: number,
) => ({
  ts: new Date(`${ts}T00:00:00.000Z`),
  open,
  high,
  low,
  close,
  volume: BigInt(volume),
});

describe('CandlesRepository (database)', () => {
  const prisma = new PrismaService();
  const repository = new CandlesRepository(prisma);
  let nvdaId: number;
  let divId: number;

  beforeAll(async () => {
    await prisma.symbol.deleteMany({ where: { ticker: { in: TICKERS } } });

    // NVDA's real 2021 4:1 and 2024 10:1 splits, with raw bars either side.
    const nvda = await prisma.symbol.create({
      data: { ticker: NVDA, name: 'NVIDIA test', exchange: 'XNAS' },
    });
    nvdaId = nvda.id;
    await prisma.candleDaily.createMany({
      data: [
        bar('2021-07-19', ['740', '760', '730', '750'], 10_000_000),
        bar('2021-07-20', ['186', '190', '185', '187.5'], 40_000_000),
        bar(
          '2024-06-07',
          ['1197.7', '1216.92', '1180.22', '1208.88'],
          41_238_600,
        ),
        bar('2024-06-10', ['120.37', '123.1', '117.01', '121.79'], 314_162_700),
      ].map((row) => ({ ...row, symbolId: nvdaId })),
    });
    await prisma.corporateAction.createMany({
      data: [
        { exDate: new Date('2021-07-20'), splitFrom: '1', splitTo: '4' },
        { exDate: new Date('2024-06-10'), splitFrom: '1', splitTo: '10' },
      ].map((row) => ({ ...row, symbolId: nvdaId, type: 'SPLIT' as const })),
    });

    // A $1 dividend going ex the day after a $100 close: factor 0.99.
    const div = await prisma.symbol.create({
      data: { ticker: DIV, name: 'Dividend test', exchange: 'XNYS' },
    });
    divId = div.id;
    await prisma.candleDaily.createMany({
      data: [
        bar('2024-01-02', ['100', '100', '100', '100'], 1_000),
        bar('2024-01-03', ['101', '101', '101', '101'], 1_000),
      ].map((row) => ({ ...row, symbolId: divId })),
    });
    await prisma.corporateAction.create({
      data: {
        symbolId: divId,
        type: 'DIVIDEND',
        exDate: new Date('2024-01-03'),
        cashAmount: '1',
      },
    });

    // These rows were written around ingestion, which is what refreshes the
    // weekly aggregate. Where it is already materialized past 2024 (any
    // database an hour old) the weeks above would otherwise read as empty.
    await new MarketDataRepository(prisma).refreshWeeklyBars({
      from: '2021-07-19',
      to: '2024-06-10',
    });
  });

  afterAll(async () => {
    await prisma.symbol.deleteMany({ where: { ticker: { in: TICKERS } } });
    await prisma.$disconnect();
  });

  const all = { from: null, to: null };

  it('divides pre-split prices by the 2024 10:1 split and multiplies volume', async () => {
    const candles = await repository.findDaily(nvdaId, all, 'split');

    expect(candles.find((c) => c.time === '2024-06-07')).toEqual({
      time: '2024-06-07',
      open: '119.77',
      high: '121.692',
      low: '118.022',
      close: '120.888',
      volume: '412386000',
    });
    // The ex-date bar is already post-split.
    expect(candles.find((c) => c.time === '2024-06-10')).toMatchObject({
      close: '121.79',
      volume: '314162700',
    });
  });

  it('compounds both splits for bars before 2021 (1/4 x 1/10)', async () => {
    const candles = await repository.findDaily(nvdaId, all, 'split');

    expect(candles.slice(0, 2)).toEqual([
      expect.objectContaining({
        time: '2021-07-19',
        close: '18.75',
        volume: '400000000',
      }),
      expect.objectContaining({
        time: '2021-07-20',
        close: '18.75',
        volume: '400000000',
      }),
    ]);
  });

  it('serves raw bars unchanged', async () => {
    const candles = await repository.findDaily(nvdaId, all, 'raw');

    expect(candles.map((c) => c.close)).toEqual([
      '750',
      '187.5',
      '1208.88',
      '121.79',
    ]);
  });

  it('limits the range by session date, inclusive', async () => {
    const candles = await repository.findDaily(
      nvdaId,
      { from: '2024-06-07', to: '2024-06-07' },
      'split',
    );

    expect(candles.map((c) => c.time)).toEqual(['2024-06-07']);
  });

  it('applies dividends only for the total-return adjustment', async () => {
    const split = await repository.findDaily(divId, all, 'split');
    const total = await repository.findDaily(divId, all, 'all');

    expect(split.map((c) => c.close)).toEqual(['100', '101']);
    expect(total.map((c) => c.close)).toEqual(['99', '101']);
    expect(total[0].volume).toBe('1000');
  });

  it('builds weekly bars, labelled by the first session of each week', async () => {
    const weeks = await repository.findWeekly(nvdaId, all, 'raw');

    expect(weeks).toEqual([
      // Monday and the split's Tuesday, as traded: the low and the close are
      // in new shares, the open and the high in old ones.
      {
        time: '2021-07-19',
        open: '740',
        high: '760',
        low: '185',
        close: '187.5',
        volume: '50000000',
      },
      // A week with one stored session, a Friday.
      expect.objectContaining({ time: '2024-06-07', close: '1208.88' }),
      expect.objectContaining({ time: '2024-06-10', close: '121.79' }),
    ]);
  });

  it('adjusts a week from the aggregate when one factor covers it', async () => {
    const weeks = await repository.findWeekly(nvdaId, all, 'split');

    // The 10:1 split went ex on the Monday after: the whole week before it
    // is divided by 10, exactly like its one daily bar.
    expect(weeks[1]).toEqual({
      time: '2024-06-07',
      open: '119.77',
      high: '121.692',
      low: '118.022',
      close: '120.888',
      volume: '412386000',
    });
    expect(weeks[2]).toMatchObject({ close: '121.79', volume: '314162700' });
  });

  it('rebuilds a week from adjusted daily bars when a split falls inside it', async () => {
    const weeks = await repository.findWeekly(nvdaId, all, 'split');

    // Monday at 1/40, Tuesday at 1/10. The raw aggregate times either factor
    // would put the high at 19 or 76 and the low at 4.625 or 18.5.
    expect(weeks[0]).toEqual({
      time: '2021-07-19',
      open: '18.5',
      high: '19',
      low: '18.25',
      close: '18.75',
      volume: '800000000',
    });
  });

  it('rebuilds a week a dividend goes ex inside, for the total-return adjustment only', async () => {
    const split = await repository.findWeekly(divId, all, 'split');
    const total = await repository.findWeekly(divId, all, 'all');

    expect(split).toEqual([
      expect.objectContaining({ time: '2024-01-02', open: '100', low: '100' }),
    ]);
    // Tuesday's 100 is 99 after the dividend; Wednesday's 101 is unchanged.
    expect(total).toEqual([
      {
        time: '2024-01-02',
        open: '99',
        high: '101',
        low: '99',
        close: '101',
        volume: '2000',
      },
    ]);
  });

  it('takes every week the range touches, whole', async () => {
    const weeks = await repository.findWeekly(
      nvdaId,
      { from: '2024-06-05', to: '2024-06-12' },
      'raw',
    );

    expect(weeks.map((week) => week.time)).toEqual(['2024-06-07', '2024-06-10']);
  });

  it('lists splits that went ex within the range, without dividends', async () => {
    expect(await repository.findSplits(nvdaId, all)).toEqual([
      { exDate: '2021-07-20', from: '1', to: '4' },
      { exDate: '2024-06-10', from: '1', to: '10' },
    ]);
    expect(
      await repository.findSplits(nvdaId, {
        from: '2024-06-10',
        to: '2024-06-10',
      }),
    ).toEqual([{ exDate: '2024-06-10', from: '1', to: '10' }]);
    expect(await repository.findSplits(divId, all)).toEqual([]);
  });

  it('reads the latest close with the previous one split-adjusted', async () => {
    const closes = await repository.findLatestCloses([nvdaId, divId]);

    // 1208.88 before the 10:1 split is 120.888 in post-split shares.
    expect(closes.get(nvdaId)).toEqual({
      date: '2024-06-10',
      close: '121.79',
      previousClose: '120.888',
    });
    // Dividends don't touch the day change.
    expect(closes.get(divId)).toEqual({
      date: '2024-01-03',
      close: '101',
      previousClose: '100',
    });
  });

  it('leaves out symbols without bars and has no previous close for one bar', async () => {
    const empty = await prisma.symbol.create({
      data: { ticker: 'ITEST_EMPTY', name: 'No bars', exchange: 'XNYS' },
    });
    const single = await prisma.symbol.create({
      data: { ticker: 'ITEST_ONE', name: 'One bar', exchange: 'XNYS' },
    });
    await prisma.candleDaily.create({
      data: { ...bar('2024-01-02', ['5', '5', '5', '5'], 1), symbolId: single.id },
    });

    const closes = await repository.findLatestCloses([empty.id, single.id]);

    expect(closes.has(empty.id)).toBe(false);
    expect(closes.get(single.id)).toEqual({
      date: '2024-01-02',
      close: '5',
      previousClose: null,
    });
  });

  it('reads the last sessions as a sparkline, split-adjusted like the latest close', async () => {
    const sparklines = await repository.findRecentCloses([nvdaId], 3);

    // The 2021-07-20 bar is only behind the 2024 10:1 split; the 2024-06-07
    // bar too; the latest bar is as traded.
    expect(sparklines.get(nvdaId)).toEqual([
      { date: '2021-07-20', close: '18.75' },
      { date: '2024-06-07', close: '120.888' },
      { date: '2024-06-10', close: '121.79' },
    ]);
    expect(await repository.findRecentCloses([], 3)).toEqual(new Map());
  });
});
