import { PrismaService } from '../database/prisma.service';
import { CandlesRepository } from './candles.repository';

// Checks the returns query against a fixture computed by hand (Phase 2 exit
// criterion). Six raw closes with a 2:1 split and a $1 dividend inside them:
//
//   date        raw   'all' adjusted           return
//   2024-01-02  100   100 * 0.5 * (1 - 1/51)
//   2024-01-03  103   103 * 0.5 * (1 - 1/51)   103/100 - 1 =  0.03
//   2024-01-04   99    99 * 0.5 * (1 - 1/51)    99/103 - 1 = -0.03883495
//   2024-01-05   50    50 * (1 - 1/51)          50/49.5 - 1 = 0.01010101  (split day)
//   2024-01-08   51    51 * (1 - 1/51) = 50     51/50 - 1 =   0.02
//   2024-01-09   50    50                        50/50 - 1 =   0           (ex-dividend day)
//
// Under 'split' the last return is 50/51 - 1 = -0.01960784 instead.
// Stats over the five 'all' returns: mean 0.00425321, sample standard
// deviation 0.02655059, adjusted skewness -1.31128159, three up days of five.

const TICKER = 'ITEST_RET';

describe('CandlesRepository.findDailyReturns (database)', () => {
  const prisma = new PrismaService();
  const repository = new CandlesRepository(prisma);
  let symbolId: number;

  beforeAll(async () => {
    await prisma.symbol.deleteMany({ where: { ticker: TICKER } });
    const symbol = await prisma.symbol.create({
      data: { ticker: TICKER, name: 'Returns test', exchange: 'XNAS' },
    });
    symbolId = symbol.id;
    const closes: [string, string][] = [
      ['2024-01-02', '100'],
      ['2024-01-03', '103'],
      ['2024-01-04', '99'],
      ['2024-01-05', '50'],
      ['2024-01-08', '51'],
      ['2024-01-09', '50'],
    ];
    await prisma.candleDaily.createMany({
      data: closes.map(([date, close]) => ({
        symbolId,
        ts: new Date(`${date}T00:00:00.000Z`),
        open: close,
        high: close,
        low: close,
        close,
        volume: BigInt(1000),
      })),
    });
    await prisma.corporateAction.createMany({
      data: [
        {
          symbolId,
          type: 'SPLIT',
          exDate: new Date('2024-01-05'),
          splitFrom: '1',
          splitTo: '2',
        },
        {
          symbolId,
          type: 'DIVIDEND',
          exDate: new Date('2024-01-09'),
          cashAmount: '1',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.symbol.deleteMany({ where: { ticker: TICKER } });
    await prisma.$disconnect();
  });

  const all = { from: null, to: null };

  it('matches the hand-computed returns and statistics', async () => {
    const series = await repository.findDailyReturns(symbolId, all, 'all');

    expect(series.returns).toEqual([
      { date: '2024-01-03', return: '0.03' },
      { date: '2024-01-04', return: '-0.03883495' },
      { date: '2024-01-05', return: '0.01010101' },
      { date: '2024-01-08', return: '0.02' },
      { date: '2024-01-09', return: '0' },
    ]);
    expect(series.stats).toEqual({
      count: 5,
      mean: '0.00425321',
      stdDev: '0.02655059',
      skew: '-1.31128159',
      best: { date: '2024-01-03', return: '0.03' },
      worst: { date: '2024-01-04', return: '-0.03883495' },
      upShare: '0.6',
    });
  });

  it('shows the ex-dividend day as a loss only without the dividend adjustment', async () => {
    const series = await repository.findDailyReturns(symbolId, all, 'split');

    expect(series.returns.at(-1)).toEqual({
      date: '2024-01-09',
      return: '-0.01960784',
    });
    expect(series.stats).toMatchObject({
      mean: '0.00033164',
      stdDev: '0.02869713',
      skew: '-0.58807027',
    });
  });

  it('gives the first day of a range its return from the session before', async () => {
    const series = await repository.findDailyReturns(
      symbolId,
      { from: '2024-01-04', to: '2024-01-05' },
      'all',
    );

    expect(series.returns).toEqual([
      { date: '2024-01-04', return: '-0.03883495' },
      { date: '2024-01-05', return: '0.01010101' },
    ]);
    expect(series.stats).toMatchObject({
      count: 2,
      // Two returns: a sample deviation but no skewness.
      stdDev: '0.03460295',
      skew: null,
      upShare: '0.5',
    });
  });

  it('returns an empty series with null stats when the range has no returns', async () => {
    const series = await repository.findDailyReturns(
      symbolId,
      { from: '2024-01-02', to: '2024-01-02' },
      'all',
    );

    expect(series).toEqual({ returns: [], stats: null });
  });
});
