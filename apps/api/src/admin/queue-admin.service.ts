import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { QueueStatus, RetryDeadResult } from '@astraq/shared';
import { MarketDataQueue } from '../market-data/jobs/market-data.queue';

/**
 * The api server's window on the market data queue (ROADMAP Phase 4 item
 * 8). The server neither enqueues nor works jobs; this reads the same
 * Redis keys the worker and the `jobs` CLI use, through the same class.
 *
 * The queue is made on first use, not at boot: BullMQ connects as soon as
 * a queue exists, and the server (and `openapi:emit`) must start without
 * Redis. A server nobody asks about the queue never opens the connection.
 */
@Injectable()
export class QueueAdminService implements OnModuleDestroy {
  private queue: MarketDataQueue | null = null;

  private get jobs(): MarketDataQueue {
    this.queue ??= new MarketDataQueue();
    return this.queue;
  }

  status(): Promise<QueueStatus> {
    return this.jobs.inspect();
  }

  /** Puts every dead letter back on the queue with all its attempts. */
  async retryDead(): Promise<RetryDeadResult> {
    return { retried: await this.jobs.retryDead() };
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.onModuleDestroy();
  }
}
