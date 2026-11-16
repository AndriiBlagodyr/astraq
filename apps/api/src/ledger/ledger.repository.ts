import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { sessionDate } from '../trading/market-hours';
import type {
  LedgerAccount as DbAccount,
  LedgerTransactionKind as DbKind,
  Prisma,
} from '../generated/prisma/client';
import type {
  LedgerAccount,
  LedgerKind,
  LedgerTransaction,
  Posting,
} from './ledger';

/** Thrown when the portfolio a posting names doesn't exist. */
export class PortfolioNotFoundError extends Error {
  constructor(readonly portfolioId: string) {
    super(`Portfolio ${portfolioId} not found`);
    this.name = 'PortfolioNotFoundError';
  }
}

/**
 * Reads and appends a portfolio's ledger (ADR 0009). There is no update
 * and no delete: the tables refuse both.
 *
 * Callers pass a portfolio id they have already checked belongs to the
 * user; fills arrive from jobs that have no user at all.
 */
@Injectable()
export class LedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The portfolio's whole history in `seq` order. */
  findTransactions(portfolioId: string): Promise<LedgerTransaction[]> {
    return this.read(this.prisma, portfolioId);
  }

  /**
   * Appends one transaction, decided from the history it follows.
   *
   * Everything happens in one database transaction holding a row lock on
   * the portfolio: two postings to the same portfolio run one after the
   * other, so `decide` always sees every earlier transaction and the next
   * `seq` is free. `decide` must be pure: it runs while the lock is held.
   */
  async append(
    portfolioId: string,
    occurredAt: Date,
    decide: (history: LedgerTransaction[]) => Posting,
  ): Promise<LedgerTransaction> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM portfolios WHERE id = ${portfolioId}::uuid FOR UPDATE
      `;
      if (locked.length === 0) throw new PortfolioNotFoundError(portfolioId);

      const history = await this.read(tx, portfolioId);
      const posting = decide(history);
      const seq = history.length + 1;
      await this.insert(tx, portfolioId, seq, occurredAt, posting);
      return { seq, date: sessionDate(occurredAt), ...posting };
    });
  }

  /**
   * Writes one transaction at `seq` and returns its id. For callers that
   * already hold the portfolio's row lock in `tx` and have read the history
   * there (the order path posts several transactions under one lock).
   */
  async insert(
    tx: Prisma.TransactionClient,
    portfolioId: string,
    seq: number,
    occurredAt: Date,
    posting: Posting,
  ): Promise<string> {
    const created = await tx.ledgerTransaction.create({
      data: {
        portfolioId,
        seq,
        kind: posting.kind.toUpperCase() as DbKind,
        occurredAt,
        splitFrom: posting.split?.from,
        splitTo: posting.split?.to,
        // Nested creates insert in array order, which is the order
        // `read` returns them in (by id).
        entries: {
          create: posting.entries.map((entry) => ({
            account: entry.account.toUpperCase() as DbAccount,
            symbolId: entry.symbolId,
            amount: entry.amount,
            quantity: entry.quantity,
          })),
        },
      },
      select: { id: true },
    });
    return created.id;
  }

  /** The portfolio's history in `seq` order, as `client` sees it. */
  async read(
    client: Prisma.TransactionClient,
    portfolioId: string,
  ): Promise<LedgerTransaction[]> {
    const rows = await client.ledgerTransaction.findMany({
      where: { portfolioId },
      orderBy: { seq: 'asc' },
      select: {
        seq: true,
        kind: true,
        occurredAt: true,
        splitFrom: true,
        splitTo: true,
        entries: {
          orderBy: { id: 'asc' },
          select: { account: true, symbolId: true, amount: true, quantity: true },
        },
      },
    });
    return rows.map((row) => ({
      seq: row.seq,
      date: sessionDate(row.occurredAt),
      kind: row.kind.toLowerCase() as LedgerKind,
      ...(row.splitFrom &&
        row.splitTo && {
          split: { from: row.splitFrom.toFixed(), to: row.splitTo.toFixed() },
        }),
      entries: row.entries.map((entry) => ({
        account: entry.account.toLowerCase() as LedgerAccount,
        symbolId: entry.symbolId,
        amount: entry.amount.toFixed(2),
        quantity: entry.quantity.toFixed(6),
      })),
    }));
  }
}
