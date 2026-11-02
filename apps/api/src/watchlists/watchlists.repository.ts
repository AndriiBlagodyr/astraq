import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

/**
 * Thrown by writes that touch a list the user doesn't own, or that doesn't
 * exist: the two cases are deliberately the same, so a guessed id learns
 * nothing. The service maps it to a 404.
 */
export class WatchlistNotFoundError extends Error {
  constructor(readonly watchlistId: string) {
    super(`Watchlist ${watchlistId} not found`);
    this.name = 'WatchlistNotFoundError';
  }
}

/** Thrown when a rename or create would reuse one of the user's names. */
export class WatchlistNameTakenError extends Error {
  constructor(readonly watchlistName: string) {
    super(`A watchlist named "${watchlistName}" already exists`);
    this.name = 'WatchlistNameTakenError';
  }
}

export interface WatchlistRow {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistSummaryRow extends WatchlistRow {
  symbolCount: number;
}

export interface WatchlistItemRow {
  symbolId: number;
  ticker: string;
  name: string;
  exchange: string;
  position: number;
  addedAt: Date;
}

const watchlistColumns = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Authorization lives here, not in the service: every query takes the
 * owner's `userId` and puts it in the WHERE clause, so there is no code path
 * that reads or changes a list without saying who asks. A list the user
 * doesn't own is indistinguishable from one that doesn't exist.
 */
@Injectable()
export class WatchlistsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The user's lists in their order, each with its symbol count. */
  async findAll(userId: string): Promise<WatchlistSummaryRow[]> {
    const rows = await this.prisma.watchlist.findMany({
      where: { userId },
      select: { ...watchlistColumns, _count: { select: { items: true } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(({ _count, ...row }) => ({
      ...row,
      symbolCount: _count.items,
    }));
  }

  /** One of the user's lists, or null. */
  async findOne(userId: string, id: string): Promise<WatchlistRow | null> {
    return this.prisma.watchlist.findFirst({
      where: { id, userId },
      select: watchlistColumns,
    });
  }

  /** The list's symbols in the user's order, with what each row shows. */
  async findItems(userId: string, id: string): Promise<WatchlistItemRow[]> {
    const items = await this.prisma.watchlistItem.findMany({
      where: { watchlistId: id, watchlist: { userId } },
      select: {
        symbolId: true,
        position: true,
        addedAt: true,
        symbol: { select: { ticker: true, name: true, exchange: true } },
      },
      orderBy: [{ position: 'asc' }, { addedAt: 'asc' }],
    });
    return items.map(({ symbol, ...item }) => ({ ...item, ...symbol }));
  }

  /** Appends a list after the user's last one. */
  async create(userId: string, name: string): Promise<WatchlistRow> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const last = await tx.watchlist.aggregate({
          where: { userId },
          _max: { position: true },
        });
        return tx.watchlist.create({
          data: { userId, name, position: (last._max.position ?? -1) + 1 },
          select: watchlistColumns,
        });
      });
    } catch (error) {
      throw translateNameConflict(error, name);
    }
  }

  async rename(
    userId: string,
    id: string,
    name: string,
  ): Promise<WatchlistRow> {
    let count: number;
    try {
      ({ count } = await this.prisma.watchlist.updateMany({
        where: { id, userId },
        data: { name },
      }));
    } catch (error) {
      throw translateNameConflict(error, name);
    }
    if (count === 0) throw new WatchlistNotFoundError(id);
    return (await this.findOne(userId, id))!;
  }

  async delete(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.watchlist.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new WatchlistNotFoundError(id);
  }

  /**
   * Appends a symbol to the list; adding one that's already there changes
   * nothing. The ownership check and the insert run in one transaction, so
   * a list deleted in between can't gain a row.
   */
  async addItem(userId: string, id: string, symbolId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.assertOwned(tx, userId, id);
      const last = await tx.watchlistItem.aggregate({
        where: { watchlistId: id },
        _max: { position: true },
      });
      await tx.watchlistItem.createMany({
        data: {
          watchlistId: id,
          symbolId,
          position: (last._max.position ?? -1) + 1,
        },
        skipDuplicates: true,
      });
      await this.touch(tx, id);
    });
  }

  /** Removes a symbol; false when it wasn't on the list. */
  async removeItem(
    userId: string,
    id: string,
    symbolId: number,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertOwned(tx, userId, id);
      const { count } = await tx.watchlistItem.deleteMany({
        where: { watchlistId: id, symbolId },
      });
      if (count === 0) return false;
      await this.touch(tx, id);
      return true;
    });
  }

  /**
   * Rewrites every row's position from `symbolIds`, which must be exactly
   * the list's symbols. Returns false when it isn't (the list changed under
   * the client), leaving the order as it was.
   */
  async reorderItems(
    userId: string,
    id: string,
    symbolIds: number[],
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertOwned(tx, userId, id);
      const items = await tx.watchlistItem.findMany({
        where: { watchlistId: id },
        select: { symbolId: true },
      });

      const current = new Set(items.map((item) => item.symbolId));
      const wanted = new Set(symbolIds);
      const samePermutation =
        wanted.size === symbolIds.length &&
        wanted.size === current.size &&
        symbolIds.every((symbolId) => current.has(symbolId));
      if (!samePermutation) return false;

      // One statement for the whole list: a row's position is its symbol's
      // index in the array the client sent (array_position is 1-based).
      await tx.$executeRaw`
        UPDATE watchlist_items
        SET position = array_position(${symbolIds}::int[], symbol_id) - 1
        WHERE watchlist_id = ${id}::uuid
      `;
      await this.touch(tx, id);
      return true;
    });
  }

  private async assertOwned(
    tx: Prisma.TransactionClient,
    userId: string,
    id: string,
  ) {
    const owned = await tx.watchlist.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) throw new WatchlistNotFoundError(id);
  }

  /** Item changes count as changes to the list. */
  private async touch(tx: Prisma.TransactionClient, id: string) {
    await tx.watchlist.update({
      where: { id },
      data: { updatedAt: new Date() },
      select: { id: true },
    });
  }
}

/** The unique (user_id, name) index rejected the name. */
function translateNameConflict(error: unknown, name: string): unknown {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return new WatchlistNameTakenError(name);
  }
  return error;
}
