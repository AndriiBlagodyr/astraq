import type { OnModuleDestroy } from '@nestjs/common';
import { type Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../../common/env';
import {
  JOB_OPTIONS,
  type JobData,
  type JobName,
  MARKET_DATA_QUEUE,
} from './market-data.jobs';

/** What is kept of a job that was given up on. */
export type DeadLetter = {
  /** The job's id in the queue it failed in. */
  jobId: string;
  /** Its payload, as it was enqueued: what a replay enqueues again. */
  data: unknown;
  error: string;
  attempts: number;
  failedAt: string;
};

/**
 * A Redis connection for BullMQ. Its own, not the api's `RedisService`: a
 * worker blocks on its connection waiting for jobs, and BullMQ requires
 * `maxRetriesPerRequest: null` so that wait survives a Redis restart
 * instead of failing after twenty retries.
 */
export function queueConnection(): Redis {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

/**
 * The market data queue and its dead-letter queue (ROADMAP Phase 4 item 2).
 *
 * BullMQ keeps a job that ran out of attempts in the queue's failed set,
 * which is trimmed by age and mixed with nothing else, but also not a
 * place a person looks. The dead-letter queue is a second queue with no
 * worker: a job that was given up on is copied there with its error
 * (`MarketDataWorker`), stays until someone reads it, and can be put back
 * (`retryDead`) once the cause is fixed.
 */
export class MarketDataQueue implements OnModuleDestroy {
  private readonly connection = queueConnection();
  readonly name: string;
  private readonly jobs: Queue;
  private readonly dead: Queue<DeadLetter>;

  /** `name` is overridden by the integration tests only. */
  constructor(name: string = MARKET_DATA_QUEUE) {
    this.name = name;
    this.jobs = new Queue(name, { connection: this.connection });
    this.dead = new Queue<DeadLetter>(`${name}-dead`, {
      connection: this.connection,
    });
  }

  /** Enqueues one job per payload, all or none. */
  async add<Name extends JobName>(
    name: Name,
    payloads: JobData<Name>[],
  ): Promise<number> {
    if (payloads.length === 0) return 0;
    const added = await this.jobs.addBulk(
      payloads.map((data) => ({ name, data, opts: JOB_OPTIONS })),
    );
    return added.length;
  }

  /**
   * Copies a job that was given up on to the dead-letter queue. The id
   * makes it once per job: a worker that dies right after writing it and
   * runs the job's last attempt again doesn't write a second one.
   */
  async deadLetter(job: Job, error: unknown): Promise<void> {
    await this.dead.add(
      job.name,
      {
        jobId: String(job.id),
        data: job.data,
        error: error instanceof Error ? error.message : String(error),
        attempts: job.attemptsMade + 1,
        failedAt: new Date().toISOString(),
      },
      { jobId: `dead-${job.id}` },
    );
  }

  /** The dead letters, oldest first, each with the name of its job. */
  async listDead(): Promise<Array<DeadLetter & { name: string }>> {
    const jobs = await this.dead.getJobs(['waiting'], 0, -1, true);
    return jobs.map((job) => ({ name: job.name, ...job.data }));
  }

  /**
   * Puts every dead letter back on the queue as a new job with all its
   * attempts, and removes it from the dead-letter queue. Returns how many.
   */
  async retryDead(): Promise<number> {
    const jobs = await this.dead.getJobs(['waiting'], 0, -1, true);
    for (const job of jobs) {
      await this.jobs.add(job.name, job.data.data, JOB_OPTIONS);
      await job.remove();
    }
    return jobs.length;
  }

  /** How many jobs are in each state, for the CLI. */
  async counts(): Promise<Record<string, number>> {
    return {
      ...(await this.jobs.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'completed',
        'failed',
      )),
      dead: await this.dead.getWaitingCount(),
    };
  }

  /** Deletes both queues and everything in them. For the tests. */
  async obliterate(): Promise<void> {
    await this.jobs.obliterate({ force: true });
    await this.dead.obliterate({ force: true });
  }

  async onModuleDestroy(): Promise<void> {
    await this.jobs.close();
    await this.dead.close();
    await this.connection.quit();
  }
}
