import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { Posting } from '../ledger/ledger';
import { LedgerRepository } from '../ledger/ledger.repository';

/** Thrown when a create would reuse one of the user's portfolio names. */
export class PortfolioNameTakenError extends Error {
  constructor(readonly portfolioName: string) {
    super(`A portfolio named "${portfolioName}" already exists`);
    this.name = 'PortfolioNameTakenError';
  }
}

export interface PortfolioRow {
  id: string;
  name: string;
  slippageBps: number;
  commissionPerOrder: string;
  commissionPerShare: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewPortfolio {
  name: string;
  slippageBps: number;
  commissionPerOrder: string;
  commissionPerShare: string;
}

const columns = {
  id: true,
  name: true,
  slippageBps: true,
  commissionPerOrder: true,
  commissionPerShare: true,
  createdAt: true,
  updatedAt: true,
} as const;

type StoredPortfolio = Prisma.PortfolioGetPayload<{ select: typeof columns }>;

const toRow = (portfolio: StoredPortfolio): PortfolioRow => ({
  ...portfolio,
  commissionPerOrder: portfolio.commissionPerOrder.toFixed(),
  commissionPerShare: portfolio.commissionPerShare.toFixed(),
});

/**
 * Portfolio rows. Like the watchlists, every query takes the owner's
 * `userId` and puts it in the WHERE clause: a portfolio the user doesn't
 * own is indistinguishable from one that doesn't exist.
 */
@Injectable()
export class PortfoliosRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerRepository,
  ) {}

  /** The user's portfolios, oldest first. */
  async findAll(userId: string): Promise<PortfolioRow[]> {
    const rows = await this.prisma.portfolio.findMany({
      where: { userId },
      select: columns,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toRow);
  }

  /** One of the user's portfolios, or null. */
  async findOne(userId: string, id: string): Promise<PortfolioRow | null> {
    const row = await this.prisma.portfolio.findFirst({
      where: { id, userId },
      select: columns,
    });
    return row && toRow(row);
  }

  /**
   * Creates a portfolio and, in the same transaction, the first entry of
   * its ledger: a portfolio never exists without its opening deposit.
   */
  async create(
    userId: string,
    data: NewPortfolio,
    opening: Posting | null,
    at: Date,
  ): Promise<PortfolioRow> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.portfolio.create({
          data: { userId, ...data },
          select: columns,
        });
        if (opening) await this.ledger.insert(tx, row.id, 1, at, opening);
        return toRow(row);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new PortfolioNameTakenError(data.name);
      }
      throw error;
    }
  }

  /** Ticker and name of each symbol, keyed by id. */
  async findSymbols(
    symbolIds: number[],
  ): Promise<Map<number, { ticker: string; name: string }>> {
    if (symbolIds.length === 0) return new Map();
    const symbols = await this.prisma.symbol.findMany({
      where: { id: { in: symbolIds } },
      select: { id: true, ticker: true, name: true },
    });
    return new Map(symbols.map(({ id, ...symbol }) => [id, symbol]));
  }
}
