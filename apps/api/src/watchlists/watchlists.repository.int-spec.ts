import { PrismaService } from '../database/prisma.service';
import {
  WatchlistNameTakenError,
  WatchlistNotFoundError,
  WatchlistsRepository,
} from './watchlists.repository';

// Runs against a real database (`pnpm --filter @astraq/api test:integration`).
// Verifies the Phase 2 exit criterion: users cannot read or modify another
// user's watchlist. Every repository method takes the caller's user id, and
// this proves the WHERE clauses actually use it.
describe('WatchlistsRepository (database) — ownership', () => {
  const prisma = new PrismaService();
  const repo = new WatchlistsRepository(prisma);
  const EMAILS = ['itest-wl-owner@veracand.test', 'itest-wl-other@veracand.test'];
  const TICKERS = ['ITWLA', 'ITWLB', 'ITWLC'];
  const PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$dGVzdA$dGVzdGhhc2g';

  let owner: string;
  let other: string;
  let symbolIds: number[];

  async function cleanup() {
    await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
    await prisma.symbol.deleteMany({ where: { ticker: { in: TICKERS } } });
  }

  beforeAll(async () => {
    await cleanup();
    const [a, b] = await Promise.all(
      EMAILS.map((email) =>
        prisma.user.create({ data: { email, passwordHash: PASSWORD_HASH } }),
      ),
    );
    owner = a!.id;
    other = b!.id;
    symbolIds = [];
    for (const ticker of TICKERS) {
      const symbol = await prisma.symbol.create({
        data: { ticker, name: `Test ${ticker}`, exchange: 'XTST' },
      });
      symbolIds.push(symbol.id);
    }
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('keeps lists, rows, and order per user', async () => {
    const list = await repo.create(owner, 'Core');
    await repo.addItem(owner, list.id, symbolIds[0]!);
    await repo.addItem(owner, list.id, symbolIds[1]!);
    await repo.addItem(owner, list.id, symbolIds[1]!); // already there: no-op
    await repo.addItem(owner, list.id, symbolIds[2]!);

    const items = await repo.findItems(owner, list.id);
    expect(items.map((item) => item.ticker)).toEqual(TICKERS);
    expect(items.map((item) => item.position)).toEqual([0, 1, 2]);

    const reversed = [...symbolIds].reverse();
    expect(await repo.reorderItems(owner, list.id, reversed)).toBe(true);
    expect(
      (await repo.findItems(owner, list.id)).map((item) => item.symbolId),
    ).toEqual(reversed);
    // Not a permutation: a missing symbol leaves the order alone.
    expect(await repo.reorderItems(owner, list.id, reversed.slice(1))).toBe(false);

    expect(await repo.removeItem(owner, list.id, symbolIds[0]!)).toBe(true);
    expect(await repo.removeItem(owner, list.id, symbolIds[0]!)).toBe(false);

    const summaries = await repo.findAll(owner);
    expect(summaries).toEqual([expect.objectContaining({ id: list.id, symbolCount: 2 })]);
    // The index's rows for the movers: every list's symbols, in list order.
    expect(await repo.findAllItems(owner)).toEqual([
      { watchlistId: list.id, symbolId: symbolIds[2], ticker: TICKERS[2] },
      { watchlistId: list.id, symbolId: symbolIds[1], ticker: TICKERS[1] },
    ]);

    await expect(repo.create(owner, 'Core')).rejects.toBeInstanceOf(WatchlistNameTakenError);
  });

  it('hides one user’s list from another, for reads and writes alike', async () => {
    const list = await repo.create(owner, 'Private');
    await repo.addItem(owner, list.id, symbolIds[0]!);

    expect(await repo.findAll(other)).toEqual([]);
    expect(await repo.findAllItems(other)).toEqual([]);
    expect(await repo.findOne(other, list.id)).toBeNull();
    expect(await repo.findItems(other, list.id)).toEqual([]);

    const notFound = WatchlistNotFoundError;
    await expect(repo.rename(other, list.id, 'Mine now')).rejects.toBeInstanceOf(notFound);
    await expect(repo.delete(other, list.id)).rejects.toBeInstanceOf(notFound);
    await expect(repo.addItem(other, list.id, symbolIds[1]!)).rejects.toBeInstanceOf(notFound);
    await expect(repo.removeItem(other, list.id, symbolIds[0]!)).rejects.toBeInstanceOf(notFound);
    await expect(
      repo.reorderItems(other, list.id, [symbolIds[0]!]),
    ).rejects.toBeInstanceOf(notFound);

    // Nothing above changed the owner's list.
    const unchanged = await repo.findOne(owner, list.id);
    expect(unchanged?.name).toBe('Private');
    expect((await repo.findItems(owner, list.id)).map((item) => item.symbolId)).toEqual([
      symbolIds[0],
    ]);

    // The same name is free for another user.
    await expect(repo.create(other, 'Private')).resolves.toMatchObject({ name: 'Private' });
  });
});
