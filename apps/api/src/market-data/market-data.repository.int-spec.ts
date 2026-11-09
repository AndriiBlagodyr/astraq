import { PrismaService } from '../database/prisma.service';
import { MarketDataRepository } from './market-data.repository';

// Runs the symbol universe sync against real Postgres (`pnpm --filter
// @astraq/api test:integration`). The sync deactivates every active symbol
// it isn't given, so each call includes whatever is active in the database
// already: the ITEST_ rows are the only ones that change.

const A = 'ITEST_UNIV_A';
const B = 'ITEST_UNIV_B';
const C = 'ITEST_UNIV_C';
const TICKERS = [A, B, C];

describe('MarketDataRepository.syncSymbols (database)', () => {
  const prisma = new PrismaService();
  const repository = new MarketDataRepository(prisma);

  const others = async () =>
    prisma.symbol.findMany({
      where: { active: true, ticker: { notIn: TICKERS } },
      select: { ticker: true, name: true, exchange: true },
    });
  const rows = async () =>
    prisma.symbol.findMany({
      where: { ticker: { in: TICKERS } },
      select: { ticker: true, name: true, exchange: true, active: true },
      orderBy: { ticker: 'asc' },
    });

  beforeAll(async () => {
    await prisma.symbol.deleteMany({ where: { ticker: { in: TICKERS } } });
    await prisma.symbol.create({
      data: { ticker: A, name: 'Old name', exchange: 'XNAS', active: false },
    });
  });

  afterAll(async () => {
    await prisma.symbol.deleteMany({ where: { ticker: { in: TICKERS } } });
    await prisma.$disconnect();
  });

  it('inserts, updates and reactivates, then reports nothing on a rerun', async () => {
    const seeds = [
      { ticker: A, name: 'New name', exchange: 'XNYS' },
      { ticker: B, name: 'B', exchange: 'XNAS' },
    ];

    expect(await repository.syncSymbols([...(await others()), ...seeds])).toEqual({
      inserted: 1,
      updated: 1,
      deactivated: 0,
    });
    expect(await rows()).toEqual([
      { ticker: A, name: 'New name', exchange: 'XNYS', active: true },
      { ticker: B, name: 'B', exchange: 'XNAS', active: true },
    ]);

    expect(await repository.syncSymbols([...(await others()), ...seeds])).toEqual({
      inserted: 0,
      updated: 0,
      deactivated: 0,
    });
  });

  it('deactivates a symbol the provider no longer lists, keeping its row', async () => {
    const summary = await repository.syncSymbols([
      ...(await others()),
      { ticker: A, name: 'New name', exchange: 'XNYS' },
      { ticker: C, name: 'C', exchange: 'BATS' },
    ]);

    expect(summary).toEqual({ inserted: 1, updated: 0, deactivated: 1 });
    expect(await rows()).toEqual([
      { ticker: A, name: 'New name', exchange: 'XNYS', active: true },
      { ticker: B, name: 'B', exchange: 'XNAS', active: false },
      { ticker: C, name: 'C', exchange: 'BATS', active: true },
    ]);
  });
});
