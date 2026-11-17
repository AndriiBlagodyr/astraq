import { Injectable } from '@nestjs/common';
import { ConflictError } from '../common/domain-errors';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type { Posting } from '../ledger/ledger';
import { LedgerRepository } from '../ledger/ledger.repository';

/** Thrown when a create would reuse one of the user's portfolio names: a 409. */
export class PortfolioNameTakenError extends ConflictError {
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

/** A held symbol and the price its shares are valued at. */
export interface HeldSymbol {
  ticker: string;
  name: string;
  /** The latest stored close in the shares that trade today; null without bars. */
  lastPrice: string | null;
  /** The session that close is from, YYYY-MM-DD. */
  priceDate: string | null;
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
      if (isUniqueViolation(error)) throw new PortfolioNameTakenError(data.name);
      throw error;
    }
  }

  /**
   * Each symbol's ticker, name, and latest stored close, keyed by id.
   *
   * The close is in the shares that trade on `today` (a session date): it
   * is multiplied by `from / to` of every split that went ex after its bar
   * and no later than `today`. Settlement has already converted the lots
   * for those splits, so on an ex-date whose bar isn't stored yet the old
   * close would price ten times the shares at the pre-split price.
   */
  async findHeldSymbols(
    symbolIds: number[],
    today: string,
  ): Promise<Map<number, HeldSymbol>> {
    if (symbolIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<
      Array<HeldSymbol & { symbolId: number }>
    >`
      SELECT s.id AS "symbolId",
             s.ticker,
             s.name,
             to_char(latest.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "priceDate",
             trim_scale(round(latest.close * splits.factor, 6))::text
               AS "lastPrice"
      FROM symbols s
      LEFT JOIN LATERAL (
        SELECT c.ts, c.close
        FROM candles_daily c
        WHERE c.symbol_id = s.id
        ORDER BY c.ts DESC
        LIMIT 1
      ) latest ON true
      LEFT JOIN LATERAL (
        SELECT numeric_product(ca.split_from / ca.split_to) AS factor
        FROM corporate_actions ca
        WHERE ca.symbol_id = s.id
          AND ca.type = 'split'
          AND ca.ex_date > (latest.ts AT TIME ZONE 'UTC')::date
          AND ca.ex_date <= ${today}::date
      ) splits ON true
      WHERE s.id = ANY(${symbolIds}::int[])
    `;
    return new Map(rows.map(({ symbolId, ...symbol }) => [symbolId, symbol]));
  }
}
