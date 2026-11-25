import type { LatestClose } from '@astraq/shared';
import { CacheStore } from '../../common/cache-store';
import { weekWindow } from '../market-data.repository';
import { MarketDataCache } from './market-data-cache';

/** The store's contract in a Map: what Redis does, without Redis. */
class MemoryStore extends CacheStore {
  readonly values = new Map<string, string>();
  readonly counters = new Map<string, number>();
  ttl: number | null = null;

  async getMany(keys: string[]) {
    return keys.map((key) => this.values.get(key) ?? null);
  }
  async setMany(entries: ReadonlyArray<readonly [string, string]>, ttl: number) {
    this.ttl = ttl;
    for (const [key, value] of entries) this.values.set(key, value);
  }
  async delete(keys: string[]) {
    for (const key of keys) this.values.delete(key);
  }
  async counter(key: string) {
    return this.counters.get(key) ?? 0;
  }
  async increment(key: string) {
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }
}

const close = (value: string): LatestClose => ({
  date: '2024-06-10',
  close: value,
  previousClose: null,
});

describe('MarketDataCache', () => {
  let store: MemoryStore;
  let cache: MarketDataCache;

  beforeEach(() => {
    store = new MemoryStore();
    cache = new MarketDataCache(store);
  });

  describe('latestCloses', () => {
    it('loads only the symbols it does not hold', async () => {
      const load = vi.fn(async (ids: number[]) =>
        new Map(ids.map((id) => [id, close(String(id))])),
      );

      await cache.latestCloses([1, 2], load);
      const closes = await cache.latestCloses([2, 3], load);

      expect(load.mock.calls).toEqual([[[1, 2]], [[3]]]);
      expect(closes).toEqual(new Map([[2, close('2')], [3, close('3')]]));
    });

    it('does not ask the loader when every symbol is held', async () => {
      const load = vi.fn(async () => new Map([[1, close('1')]]));

      await cache.latestCloses([1], load);
      await cache.latestCloses([1], load);

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('remembers that a symbol has no bars, and leaves it out', async () => {
      const load = vi.fn(async () => new Map<number, LatestClose>());

      expect(await cache.latestCloses([9], load)).toEqual(new Map());
      expect(await cache.latestCloses([9], load)).toEqual(new Map());

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('loads a symbol again after its bars were written', async () => {
      const load = vi
        .fn<(ids: number[]) => Promise<Map<number, LatestClose>>>()
        .mockResolvedValueOnce(new Map([[1, close('100')], [2, close('50')]]))
        .mockResolvedValueOnce(new Map([[1, close('101')]]));

      await cache.latestCloses([1, 2], load);
      await cache.forgetCloses([1]);
      const closes = await cache.latestCloses([1, 2], load);

      expect(load).toHaveBeenLastCalledWith([1]);
      expect(closes.get(1)).toEqual(close('101'));
      expect(closes.get(2)).toEqual(close('50'));
    });

    it('stores every entry with a time to live', async () => {
      await cache.latestCloses([1], async () => new Map());

      expect(store.ttl).toBeGreaterThan(0);
    });

    it('reads a value that is not JSON as a miss', async () => {
      store.values.set('v1:close:1', '{half');

      const closes = await cache.latestCloses([1], async () =>
        new Map([[1, close('7')]]),
      );

      expect(closes.get(1)).toEqual(close('7'));
    });
  });

  describe('search', () => {
    const rows = [{ id: 7, ticker: 'NVDA' }];

    it('keeps a search by its query, whatever the case', async () => {
      const load = vi.fn(async () => rows);

      await cache.search('nv', load);
      expect(await cache.search('NV', load)).toEqual(rows);
      await cache.search('nvd', load);

      expect(load).toHaveBeenCalledTimes(2);
    });

    it('keeps the search without a query apart from the others', async () => {
      const load = vi.fn(async () => rows);

      await cache.search(undefined, load);
      await cache.search(undefined, load);
      await cache.search('a', load);

      expect(load).toHaveBeenCalledTimes(2);
    });

    it('forgets every search at once by moving to the next generation', async () => {
      const load = vi.fn(async () => rows);
      await cache.search('nv', load);
      await cache.search('aa', load);

      await cache.forgetSearches();
      await cache.search('nv', load);
      await cache.search('aa', load);

      expect(load).toHaveBeenCalledTimes(4);
      // The old generation's entries are still stored: unreachable, and
      // left to their TTL.
      expect([...store.values.keys()].sort()).toEqual([
        'v1:search:0:aa',
        'v1:search:0:nv',
        'v1:search:1:aa',
        'v1:search:1:nv',
      ]);
    });
  });
});

describe('weekWindow', () => {
  it('widens a range to whole weeks, Monday to the Monday after', () => {
    // Wednesday 2024-06-05 to Tuesday 2024-06-11.
    expect(weekWindow({ from: '2024-06-05', to: '2024-06-11' })).toEqual({
      from: '2024-06-03',
      to: '2024-06-17',
    });
  });

  it('gives one session a window of exactly its week', () => {
    expect(weekWindow({ from: '2024-06-10', to: '2024-06-10' })).toEqual({
      from: '2024-06-10',
      to: '2024-06-17',
    });
    // A Sunday belongs to the week that started six days before.
    expect(weekWindow({ from: '2024-06-09', to: '2024-06-09' })).toEqual({
      from: '2024-06-03',
      to: '2024-06-10',
    });
  });
});
