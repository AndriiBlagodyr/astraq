import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from './env';

/**
 * The api's one Redis client: rate-limit counters now, BullMQ queues in
 * Phase 4. Like PrismaService it connects on the first command, not at
 * construction, so `openapi:emit` (which creates the app without starting
 * it) doesn't open a socket that would keep the process alive, and the
 * app boots without Redis; the first throttled request reports it.
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    super(env.REDIS_URL, { lazyConnect: true });
    this.on('error', (error: Error) => {
      this.logger.error({ err: error }, 'Redis connection error');
    });
  }

  async onModuleDestroy() {
    // A client that never connected has nothing to say goodbye to; quit()
    // would first connect just to hang up.
    if (this.status === 'wait') return;
    await this.quit();
  }
}
