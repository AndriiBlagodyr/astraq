import { Injectable } from '@nestjs/common';
import type { SymbolSummary } from '@astraq/shared';
import { PrismaService } from '../database/prisma.service';

const SEARCH_LIMIT = 50;
const summary = {
  id: true,
  ticker: true,
  name: true,
  exchange: true,
} as const;

/** A symbol as stored; the service adds its latest close. */
export type SymbolRow = Omit<SymbolSummary, 'latestClose'> & { id: number };

@Injectable()
export class SymbolsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active symbols whose ticker starts with, or name contains, `query`, best
   * match first: ticker matches (an exact ticker sorts first among them),
   * then name-only matches, each alphabetical. The web opens the top result
   * on an exact ticker, so the order is part of the contract.
   */
  async search(query: string | undefined): Promise<SymbolRow[]> {
    const byTicker = { ticker: 'asc' } as const;
    if (!query) {
      return this.prisma.symbol.findMany({
        where: { active: true },
        select: summary,
        orderBy: byTicker,
        take: SEARCH_LIMIT,
      });
    }

    const tickerMatch = {
      ticker: { startsWith: query, mode: 'insensitive' },
    } as const;
    const [tickerMatches, nameMatches] = await Promise.all([
      this.prisma.symbol.findMany({
        where: { active: true, ...tickerMatch },
        select: summary,
        orderBy: byTicker,
        take: SEARCH_LIMIT,
      }),
      this.prisma.symbol.findMany({
        where: {
          active: true,
          name: { contains: query, mode: 'insensitive' },
          NOT: tickerMatch,
        },
        select: summary,
        orderBy: byTicker,
        take: SEARCH_LIMIT,
      }),
    ]);
    return [...tickerMatches, ...nameMatches].slice(0, SEARCH_LIMIT);
  }

  /** The symbol's id, or null when the ticker is unknown. */
  async findIdByTicker(ticker: string): Promise<number | null> {
    const symbol = await this.prisma.symbol.findUnique({
      where: { ticker },
      select: { id: true },
    });
    return symbol?.id ?? null;
  }
}
