import { PrismaService } from '../database/prisma.service';
import { CandlesRepository } from './candles.repository';

// Runs the adjustment SQL against real Postgres + TimescaleDB with the
// migrations applied (`pnpm --filter @astraq/api test:integration`). Test
// symbols get an ITEST_ prefix so they never collide with loaded data.

const NVDA = 'ITEST_NVDA';
const DIV = 'ITEST_DIV';

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
    await prisma.symbol.deleteMany({ where: { ticker: { in: [NVDA, DIV] } } });

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
  });

  afterAll(async () => {
    await prisma.symbol.deleteMany({ where: { ticker: { in: [NVDA, DIV] } } });
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
});
