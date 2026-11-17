import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../common/domain-errors';
import { lower, upper } from '../common/enum-case';
import { sessionDate } from '../trading/market-hours';
import type { Prisma } from '../generated/prisma/client';
import type { LedgerTransaction, Posting } from './ledger';

/** Thrown when the portfolio a posting names doesn't exist, or isn't the user's. */
export class PortfolioNotFoundError extends NotFoundError {
  constructor(readonly portfolioId: string) {
    super(`Portfolio ${portfolioId} not found`);
    this.name = 'PortfolioNotFoundError';
  }
}

/**
 * Reads and writes the rows of a portfolio's ledger (ADR 0009). There is no
 * update and no delete: the tables refuse both.
 *
 * It opens no transaction of its own. Both methods take the caller's: the
 * order path (`OrdersRepository.transact`) locks the portfolio's row, reads
 * the history here, decides, and inserts here, all in one transaction, and
 * that is the only place a ledger is written.
 */
@Injectable()
export class LedgerRepository {
  /**
   * Writes one transaction at `seq` and returns its id. The caller holds
   * the portfolio's row lock in `tx` and has read the history there, so
   * `seq` is the next free one.
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
        kind: upper(posting.kind),
        occurredAt,
        splitFrom: posting.split?.from,
        splitTo: posting.split?.to,
        // Nested creates insert in array order, which is the order
        // `read` returns them in (by id).
        entries: {
          create: posting.entries.map((entry) => ({
            account: upper(entry.account),
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
      kind: lower(row.kind),
      ...(row.splitFrom &&
        row.splitTo && {
          split: { from: row.splitFrom.toFixed(), to: row.splitTo.toFixed() },
        }),
      entries: row.entries.map((entry) => ({
        account: lower(entry.account),
        symbolId: entry.symbolId,
        amount: entry.amount.toFixed(2),
        quantity: entry.quantity.toFixed(6),
      })),
    }));
  }
}
