import { format } from '../common/decimal';
import { PrismaService } from '../database/prisma.service';
import { LedgerError, positions } from './ledger';
import { LedgerRepository, PortfolioNotFoundError } from './ledger.repository';
import { LedgerService } from './ledger.service';

// Runs against a real database (`pnpm --filter @astraq/api test:integration`).
// Verifies what only the database can: postings to one portfolio never
// interleave, the ledger tables refuse edits, and an unbalanced transaction
// can't commit (ADR 0009).
describe('Ledger (database)', () => {
  const prisma = new PrismaService();
  const ledger = new LedgerService(new LedgerRepository(prisma));
  const EMAIL = 'itest-ledger@veracand.test';
  const TICKER = 'ITLDG';
  const PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$dGVzdA$dGVzdGhhc2g';
  const AT = new Date('2026-11-12T15:00:00Z');

  let userId: string;
  let symbolId: number;

  // Deleting the user cascades through portfolios to the ledger: the one
  // way ledger rows are ever removed.
  async function cleanup() {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.symbol.deleteMany({ where: { ticker: TICKER } });
  }

  async function newPortfolio(name: string) {
    const portfolio = await prisma.portfolio.create({
      data: { userId, name },
    });
    return portfolio.id;
  }

  beforeAll(async () => {
    await cleanup();
    const user = await prisma.user.create({
      data: { email: EMAIL, passwordHash: PASSWORD_HASH },
    });
    userId = user.id;
    const symbol = await prisma.symbol.create({
      data: { ticker: TICKER, name: 'Ledger test', exchange: 'XTST' },
    });
    symbolId = symbol.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('stores postings and derives the same state back from them', async () => {
    const portfolioId = await newPortfolio('Round trip');
    await ledger.deposit(portfolioId, '1000.00', AT);
    await ledger.recordBuy(
      portfolioId,
      { symbolId, quantity: '3', notional: '10.00', commission: '1.00' },
      AT,
    );
    const sold = await ledger.recordSell(
      portfolioId,
      { symbolId, quantity: '1', notional: '4.00', commission: '0' },
      AT,
    );
    expect(sold.seq).toBe(3);

    const state = await ledger.state(portfolioId);
    expect(format(state.cash)).toBe('993.00'); // 1000 - 10 - 1 + 4
    expect(format(state.realizedPnl)).toBe('0.67'); // 4.00 - 3.33
    expect(format(state.fees)).toBe('1.00');
    const [position] = positions(state);
    expect(format(position!.quantity)).toBe('2.000000');
    expect(format(position!.cost)).toBe('6.67');

    await expect(
      ledger.withdraw(portfolioId, '993.01', AT),
    ).rejects.toBeInstanceOf(LedgerError);
    await expect(
      ledger.deposit('00000000-0000-7000-8000-000000000000', '1', AT),
    ).rejects.toBeInstanceOf(PortfolioNotFoundError);
  });

  it('runs concurrent postings to one portfolio one after the other', async () => {
    const portfolioId = await newPortfolio('Concurrent');
    await ledger.deposit(portfolioId, '100.00', AT);

    // Ten withdrawals of 30 race for 100 in cash: exactly three fit. Without
    // the portfolio lock they'd each see 100 and overdraw, or collide on seq.
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => ledger.withdraw(portfolioId, '30', AT)),
    );
    const done = results.filter((result) => result.status === 'fulfilled');
    expect(done).toHaveLength(3);
    for (const result of results) {
      if (result.status === 'rejected') {
        expect(result.reason).toMatchObject({ code: 'insufficient_cash' });
      }
    }

    const rows = await prisma.ledgerTransaction.findMany({
      where: { portfolioId },
      orderBy: { seq: 'asc' },
    });
    expect(rows.map((row) => row.seq)).toEqual([1, 2, 3, 4]);
    expect(format((await ledger.state(portfolioId)).cash)).toBe('10.00');
  });

  it('refuses updates, direct deletes, and unbalanced transactions', async () => {
    const portfolioId = await newPortfolio('Guards');
    await ledger.deposit(portfolioId, '50.00', AT);
    const transaction = await prisma.ledgerTransaction.findFirstOrThrow({
      where: { portfolioId },
    });

    await expect(
      prisma.ledgerEntry.updateMany({
        where: { transactionId: transaction.id },
        data: { amount: '5000.00' },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      prisma.ledgerEntry.deleteMany({
        where: { transactionId: transaction.id },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      prisma.ledgerTransaction.delete({ where: { id: transaction.id } }),
    ).rejects.toThrow(/append-only/);

    // Cash from nowhere: one leg, no counterpart.
    await expect(
      prisma.ledgerTransaction.create({
        data: {
          portfolioId,
          seq: 2,
          kind: 'DEPOSIT',
          occurredAt: AT,
          entries: { create: [{ account: 'CASH', amount: '1000000.00' }] },
        },
      }),
    ).rejects.toThrow(/unbalanced/);

    // Nothing above left a mark.
    expect(format((await ledger.state(portfolioId)).cash)).toBe('50.00');

    // The cascade from a deleted portfolio is the one delete allowed.
    await prisma.portfolio.delete({ where: { id: portfolioId } });
    expect(
      await prisma.ledgerEntry.count({
        where: { transactionId: transaction.id },
      }),
    ).toBe(0);
  });
});
