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

  /** Active symbols whose ticker starts with, or name contains, `query`. */
  search(query: string | undefined): Promise<SymbolRow[]> {
    return this.prisma.symbol.findMany({
      where: {
        active: true,
        ...(query && {
          OR: [
            { ticker: { startsWith: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
          ],
        }),
      },
      select: summary,
      orderBy: { ticker: 'asc' },
      take: SEARCH_LIMIT,
    });
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
