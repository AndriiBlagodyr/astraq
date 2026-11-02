import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Watchlist, WatchlistList } from '@astraq/shared';
import { CandlesRepository } from '../symbols/candles.repository';
import { SymbolsRepository } from '../symbols/symbols.repository';
import {
  WatchlistNameTakenError,
  WatchlistNotFoundError,
  type WatchlistRow,
  WatchlistsRepository,
} from './watchlists.repository';

/** How many sessions a row's sparkline spans: about six weeks of trading. */
export const SPARKLINE_SESSIONS = 30;

@Injectable()
export class WatchlistsService {
  constructor(
    private readonly watchlists: WatchlistsRepository,
    private readonly symbols: SymbolsRepository,
    private readonly candles: CandlesRepository,
  ) {}

  async list(userId: string): Promise<WatchlistList> {
    const rows = await this.watchlists.findAll(userId);
    return {
      watchlists: rows.map((row) => ({
        id: row.id,
        name: row.name,
        symbolCount: row.symbolCount,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async create(userId: string, name: string): Promise<Watchlist> {
    const row = await this.run(() => this.watchlists.create(userId, name));
    return this.withItems(userId, row);
  }

  /** A list with its rows; 404 when it isn't the user's. */
  async get(userId: string, id: string): Promise<Watchlist> {
    const row = await this.watchlists.findOne(userId, id);
    if (!row) throw new NotFoundException(`Watchlist ${id} not found`);
    return this.withItems(userId, row);
  }

  async rename(userId: string, id: string, name: string): Promise<Watchlist> {
    const row = await this.run(() => this.watchlists.rename(userId, id, name));
    return this.withItems(userId, row);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.run(() => this.watchlists.delete(userId, id));
  }

  /** Adds a symbol (case-insensitive ticker); 404 for an unknown one. */
  async addItem(
    userId: string,
    id: string,
    rawTicker: string,
  ): Promise<Watchlist> {
    const symbolId = await this.resolveTicker(rawTicker);
    await this.run(() => this.watchlists.addItem(userId, id, symbolId));
    return this.get(userId, id);
  }

  /** Removing a symbol that isn't on the list is a no-op, not an error. */
  async removeItem(
    userId: string,
    id: string,
    rawTicker: string,
  ): Promise<void> {
    const symbolId = await this.symbols.findIdByTicker(rawTicker.toUpperCase());
    if (symbolId === null) {
      // An unknown ticker can't be on the list, but the list must still be
      // the user's for the 204 to mean anything.
      await this.get(userId, id);
      return;
    }
    await this.run(() => this.watchlists.removeItem(userId, id, symbolId));
  }

  /** Puts the list in the order given; 400 unless it names every row once. */
  async reorder(
    userId: string,
    id: string,
    rawTickers: string[],
  ): Promise<Watchlist> {
    const ids = await Promise.all(
      rawTickers.map((ticker) =>
        this.symbols.findIdByTicker(ticker.toUpperCase()),
      ),
    );
    const symbolIds = ids.filter((symbolId) => symbolId !== null);
    const ok =
      symbolIds.length === ids.length &&
      (await this.run(() =>
        this.watchlists.reorderItems(userId, id, symbolIds),
      ));
    if (!ok) {
      throw new BadRequestException(
        'tickers must name every symbol on the list exactly once',
      );
    }
    return this.get(userId, id);
  }

  private async withItems(
    userId: string,
    row: WatchlistRow,
  ): Promise<Watchlist> {
    const items = await this.watchlists.findItems(userId, row.id);
    const symbolIds = items.map((item) => item.symbolId);
    const [closes, sparklines] = await Promise.all([
      this.candles.findLatestCloses(symbolIds),
      this.candles.findRecentCloses(symbolIds, SPARKLINE_SESSIONS),
    ]);
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      items: items.map((item) => ({
        ticker: item.ticker,
        name: item.name,
        exchange: item.exchange,
        latestClose: closes.get(item.symbolId) ?? null,
        sparkline: sparklines.get(item.symbolId) ?? [],
        addedAt: item.addedAt.toISOString(),
      })),
    };
  }

  private async resolveTicker(rawTicker: string): Promise<number> {
    const ticker = rawTicker.toUpperCase();
    const symbolId = await this.symbols.findIdByTicker(ticker);
    if (symbolId === null) {
      throw new NotFoundException(`Unknown symbol ${ticker}`);
    }
    return symbolId;
  }

  /** Turns the repository's domain errors into HTTP problems. */
  private async run<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof WatchlistNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof WatchlistNameTakenError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
