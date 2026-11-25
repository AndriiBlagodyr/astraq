import { Injectable } from '@nestjs/common';
import type { LatestClose } from '@astraq/shared';
import { CacheStore } from '../../common/cache-store';
import { inSpan } from '../../common/span';

// Bump when a cached value's shape changes: the old keys are then never
// read again and expire by themselves.
const VERSION = 'v1';
const closeKey = (symbolId: number) => `${VERSION}:close:${symbolId}`;
const SEARCH_GENERATION = `${VERSION}:search:generation`;

/**
 * How long a value may outlive a missed invalidation. Every write of market
 * data invalidates what it changed (see `forgetCloses`), so in the normal
 * course these are never reached by a stale value; they bound the cases
 * invalidation can't cover (Redis down during a write, the race below).
 */
const CLOSE_TTL_SECONDS = 60 * 60;
const SEARCH_TTL_SECONDS = 10 * 60;

/**
 * The cache in front of the two hottest market data reads (ROADMAP Phase 4
 * item 6): a symbol's latest close, which every row of a watchlist, of the
 * stocks table, and of a search result carries, and the symbol search
 * itself, which the command palette runs on every keystroke.
 *
 * Both are cache-aside: read the cache, load what is missing from the
 * database, store it. What makes that safe is that this data has one
 * writer, `IngestionService`, and it tells the cache what it changed.
 *
 * Not for trading. Valuation, the order checks, and settlement read the
 * database: a price an order is decided on must not be an hour old.
 *
 * Two things this doesn't do, knowingly:
 * - A reader that loaded a close just before a write can store it just
 *   after the write's delete. The value then stays until its TTL.
 * - Many requests missing the same key at once each load it. The loads
 *   are index lookups; a lock around them would cost more than it saves.
 */
@Injectable()
export class MarketDataCache {
  constructor(private readonly store: CacheStore) {}

  /**
   * The latest close of each symbol that has one, keyed by symbol id.
   * `load` is asked only for the ids the cache doesn't hold.
   *
   * One key per symbol rather than one per list of ids: two watchlists
   * that share a symbol share its entry, and a new bar invalidates exactly
   * one key. A symbol without bars is cached too, as `null`: otherwise the
   * universe's thousands of never-loaded tickers would miss on every search.
   */
  async latestCloses(
    symbolIds: number[],
    load: (missing: number[]) => Promise<Map<number, LatestClose>>,
  ): Promise<Map<number, LatestClose>> {
    if (symbolIds.length === 0) return new Map();
    return inSpan('cache.latest-closes', {}, async (span) => {
      const cached = await this.store.getMany(symbolIds.map(closeKey));
      const closes = new Map<number, LatestClose>();
      const missing: number[] = [];
      symbolIds.forEach((id, index) => {
        const value = parse<LatestClose | null>(cached[index]);
        if (value === undefined) missing.push(id);
        else if (value !== null) closes.set(id, value);
      });
      span.setAttributes({
        'cache.hits': symbolIds.length - missing.length,
        'cache.misses': missing.length,
      });
      if (missing.length === 0) return closes;

      const loaded = await load(missing);
      await this.store.setMany(
        missing.map((id) => [
          closeKey(id),
          JSON.stringify(loaded.get(id) ?? null),
        ]),
        CLOSE_TTL_SECONDS,
      );
      for (const [id, close] of loaded) closes.set(id, close);
      return closes;
    });
  }

  /**
   * A search's rows, by its query in lower case (the search ignores case).
   *
   * A search can't be invalidated by key: there is no telling which of the
   * queries people typed a renamed or newly loaded symbol belongs to, and
   * Redis has no "delete by prefix" that isn't a scan of every key. So the
   * key carries a generation number read from a counter, and invalidating
   * is incrementing the counter: every older entry is unreachable at once
   * and expires by its TTL.
   */
  async search<Row>(
    query: string | undefined,
    load: () => Promise<Row[]>,
  ): Promise<Row[]> {
    return inSpan('cache.symbol-search', {}, async (span) => {
      const generation = await this.store.counter(SEARCH_GENERATION);
      const key = `${VERSION}:search:${generation}:${(query ?? '').toLowerCase()}`;
      const [cached] = await this.store.getMany([key]);
      const rows = parse<Row[]>(cached);
      span.setAttribute('cache.hit', rows !== undefined);
      if (rows !== undefined) return rows;

      const loaded = await load();
      await this.store.setMany(
        [[key, JSON.stringify(loaded)]],
        SEARCH_TTL_SECONDS,
      );
      return loaded;
    });
  }

  /** After a write to these symbols' bars or corporate actions. */
  async forgetCloses(symbolIds: number[]): Promise<void> {
    await this.store.delete(symbolIds.map(closeKey));
  }

  /**
   * After a write that changes what a search finds: the symbol list
   * synced, a symbol created or renamed, or a symbol's first bars (the
   * search without a query lists the symbols that have any).
   */
  async forgetSearches(): Promise<void> {
    await this.store.increment(SEARCH_GENERATION);
  }
}

/** A cached value; undefined for a miss or for something that isn't JSON. */
function parse<T>(value: string | null | undefined): T | undefined {
  if (value === null || value === undefined) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}
