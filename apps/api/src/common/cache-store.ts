import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { errorMessage } from './error-message';

/**
 * Where cached values are kept: strings by key, each with a time to live,
 * and counters that only go up. An abstract class so Nest can inject it and
 * a test can swap the Redis one for `NoCacheStore`.
 *
 * A store never throws. A cache that is down is a cache that misses: the
 * caller reads the database as it did before there was one.
 */
export abstract class CacheStore {
  /** The values of `keys`, in order; null where there is none. */
  abstract getMany(keys: string[]): Promise<(string | null)[]>;
  /** Stores every entry for `ttlSeconds`. */
  abstract setMany(
    entries: ReadonlyArray<readonly [key: string, value: string]>,
    ttlSeconds: number,
  ): Promise<void>;
  abstract delete(keys: string[]): Promise<void>;
  /** A counter's value; 0 when it was never incremented. */
  abstract counter(key: string): Promise<number>;
  abstract increment(key: string): Promise<void>;
}

/** Every key the cache writes starts with this, apart from BullMQ's `bull:`. */
const PREFIX = 'cache:';

/**
 * The cache in Redis, by hand on the client the api already has
 * (ROADMAP Phase 4 item 6): `MGET` for a batch of reads, one pipeline of
 * `SET ... EX` for a batch of writes, `DEL` and `INCR` for invalidation.
 *
 * Every key has a TTL. This Redis also holds the job queue, which needs
 * `maxmemory-policy noeviction` (a queue must not lose a job to make room),
 * so nothing here is ever evicted for space: the TTL is the only thing that
 * bounds the cache, and a key without one would stay for good.
 */
@Injectable()
export class RedisCacheStore extends CacheStore {
  private readonly logger = new Logger(RedisCacheStore.name);

  constructor(private readonly redis: RedisService) {
    super();
  }

  async getMany(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    return this.orElse(
      keys.map(() => null),
      () => this.redis.mget(keys.map((key) => PREFIX + key)),
    );
  }

  async setMany(
    entries: ReadonlyArray<readonly [string, string]>,
    ttlSeconds: number,
  ): Promise<void> {
    if (entries.length === 0) return;
    await this.orElse(undefined, async () => {
      // One round trip for the batch. No MULTI: the writes don't depend on
      // each other, and a half-written batch is only a few more misses.
      const pipeline = this.redis.pipeline();
      for (const [key, value] of entries) {
        pipeline.set(PREFIX + key, value, 'EX', ttlSeconds);
      }
      await pipeline.exec();
    });
  }

  async delete(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.orElse(undefined, async () => {
      await this.redis.del(keys.map((key) => PREFIX + key));
    });
  }

  async counter(key: string): Promise<number> {
    return this.orElse(0, async () =>
      Number((await this.redis.get(PREFIX + key)) ?? 0),
    );
  }

  async increment(key: string): Promise<void> {
    await this.orElse(undefined, async () => {
      await this.redis.incr(PREFIX + key);
    });
  }

  /** `work`'s answer, or `fallback` when Redis can't give one. */
  private async orElse<T>(fallback: T, work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      this.logger.warn(
        `Cache unavailable: ${errorMessage(error)}`,
      );
      return fallback;
    }
  }
}

/** A store that keeps nothing: every read misses. For tests of what's behind a cache. */
export class NoCacheStore extends CacheStore {
  async getMany(keys: string[]): Promise<(string | null)[]> {
    return keys.map(() => null);
  }
  async setMany(): Promise<void> {}
  async delete(): Promise<void> {}
  async counter(): Promise<number> {
    return 0;
  }
  async increment(): Promise<void> {}
}
