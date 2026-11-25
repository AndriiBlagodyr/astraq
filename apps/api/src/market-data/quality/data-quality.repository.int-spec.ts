import { utcMidnight } from '../../common/dates';
import { PrismaService } from '../../database/prisma.service';
import { DataQualityRepository } from './data-quality.repository';

// The three checks that are SQL, against real Postgres (`pnpm --filter
// @astraq/api test:integration`). One symbol with a week of bars in 1990,
// far from anything else stored, and one defect per check. The checks read
// every active symbol, so each assertion looks at this ticker's findings
// only and asks for more of them than a developer's database could hold.

const TICKER = 'ITEST_DQ';
const ALL = 1_000_000;
// Monday to Friday, and the Monday after.
const WEEK = ['1990-01-08', '1990-01-09', '1990-01-10', '1990-01-11', '1990-01-12'];
const AFTER = '1990-01-15';

describe('DataQualityRepository (database)', () => {
  const prisma = new PrismaService();
  const repository = new DataQualityRepository(prisma);
  const sessions = [...WEEK, AFTER].map(utcMidnight);

  const mine = async (
    found: Promise<{ issues: Array<{ ticker: string }> } | null>,
  ) => ((await found)?.issues ?? []).filter((issue) => issue.ticker === TICKER);

  const cleanUp = async () => {
    await prisma.symbol.deleteMany({ where: { ticker: TICKER } });
    await prisma.marketSession.deleteMany({ where: { date: { in: sessions } } });
  };

  beforeAll(async () => {
    await cleanUp();
    const { id: symbolId } = await prisma.symbol.create({
      data: { ticker: TICKER, name: 'Data quality', exchange: 'XNAS' },
    });
    const bar = (date: string, values: object = {}) => ({
      symbolId,
      ts: utcMidnight(date),
      open: '10',
      high: '12',
      low: '9',
      close: '11',
      volume: 1000n + BigInt(date.slice(-2)),
      ...values,
    });
    await prisma.candleDaily.createMany({
      data: [
        bar('1990-01-08'),
        // A low above the close.
        bar('1990-01-09', { low: '11.5' }),
        // No bar on Wednesday the 10th.
        bar('1990-01-11'),
        // Thursday's bar again, to the share.
        bar('1990-01-12', { volume: 1011n }),
        bar(AFTER),
      ],
    });
    await prisma.marketSession.createMany({
      data: sessions.map((date) => ({
        date,
        opensAt: new Date(date.getTime() + 14.5 * 60 * 60_000),
        closesAt: new Date(date.getTime() + 21 * 60 * 60_000),
      })),
    });
  });

  afterAll(async () => {
    await cleanUp();
    await prisma.$disconnect();
  });

  it('finds the session without a bar inside the series', async () => {
    expect(await mine(repository.findMissingSessions(ALL))).toEqual([
      {
        ticker: TICKER,
        session: '1990-01-10',
        detail: 'No bar for a session the exchange held',
      },
    ]);
  });

  it('finds the bar that repeats the session before it', async () => {
    expect(await mine(repository.findDuplicateBars(ALL))).toEqual([
      {
        ticker: TICKER,
        session: '1990-01-12',
        detail: 'The same prices and volume as the session before',
      },
    ]);
  });

  it('finds the bar whose low is above its close', async () => {
    expect(await mine(repository.findOhlcViolations(ALL))).toEqual([
      {
        ticker: TICKER,
        session: '1990-01-09',
        detail:
          'Low above the open or the close: open 10, high 12, low 11.5, ' +
          'close 11, volume 1009',
      },
    ]);
  });

  it('counts everything it found, not only what it returns', async () => {
    const one = await repository.findOhlcViolations(1);
    const all = await repository.findOhlcViolations(ALL);
    expect(one.issues).toHaveLength(1);
    expect(one.count).toBe(all.count);
    expect(all.count).toBe(all.issues.length);
  });
});
