import {
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { type Job, UnrecoverableError, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { ProviderError } from '../provider/market-data-provider';
import { retryDelayMs } from './market-data.jobs';
import { isFatal, type JobResult } from './market-data.processor';
import { type MarketDataQueue, queueConnection } from './market-data.queue';

/** The work of one job; `MarketDataProcessor.process` outside the tests. */
export type Process = (name: string, payload: unknown) => Promise<JobResult>;

/** How long a failed job waits; `retryDelayMs` outside the tests. */
export type RetryDelay = (
  attemptsMade: number,
  retryAfterMs: number | null,
) => number;

/**
 * Takes jobs off the market data queue and decides what a failure means
 * (ROADMAP Phase 4 item 2):
 *
 * - A failure that can pass (the provider is down or rate limiting, the
 *   database is away) is retried after `retryDelayMs`, up to the job's
 *   attempts.
 * - A failure that can't (`isFatal`) ends the job at once: retrying a bad
 *   key eight times only delays the news.
 * - Either way, a job that is given up on is copied to the dead-letter
 *   queue before it is marked failed, so "failed for good" is never only
 *   a log line.
 *
 * Two jobs at a time and thirty a minute: a batch is a handful of provider
 * requests, and this keeps a full refresh well inside Alpaca's 200 a
 * minute without a limiter of our own.
 */
export class MarketDataWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MarketDataWorker.name);
  private connection: Redis | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly queue: MarketDataQueue,
    private readonly process: Process,
    private readonly retryDelay: RetryDelay = retryDelayMs,
  ) {}

  onApplicationBootstrap(): void {
    this.connection = queueConnection();
    this.worker = new Worker(this.queue.name, (job) => this.run(job), {
      connection: this.connection,
      concurrency: 2,
      limiter: { max: 30, duration: 60_000 },
      settings: {
        backoffStrategy: (attemptsMade, _type, error) =>
          this.retryDelay(
            attemptsMade,
            error instanceof ProviderError ? error.retryAfterMs : null,
          ),
      },
    });
    this.worker.on('completed', (job, result: JobResult) => {
      this.logger.log(`${job.name} ${job.id} done: ${JSON.stringify(result)}`);
    });
    this.worker.on('failed', (job, error) => {
      this.logger.warn(
        `${job?.name} ${job?.id} failed (attempt ${job?.attemptsMade} of ` +
          `${job?.opts.attempts ?? 1}): ${error.message}`,
      );
    });
    this.worker.on('error', (error) => {
      this.logger.error(`Worker error: ${error.message}`);
    });
    this.logger.log(`Working the "${this.queue.name}" queue`);
  }

  private async run(job: Job): Promise<JobResult> {
    try {
      return await this.process(job.name, job.data);
    } catch (error) {
      const fatal = isFatal(error);
      // `attemptsMade` counts the attempts before this one.
      const last = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (fatal || last) {
        await this.queue.deadLetter(job, error);
        this.logger.error(`${job.name} ${job.id} dead-lettered`);
      }
      // BullMQ stops retrying on an UnrecoverableError and nothing else.
      if (fatal && !(error instanceof UnrecoverableError)) {
        throw new UnrecoverableError(
          error instanceof Error ? error.message : String(error),
        );
      }
      throw error;
    }
  }

  /** Lets the jobs in flight finish, then disconnects. */
  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.connection?.quit();
  }
}
