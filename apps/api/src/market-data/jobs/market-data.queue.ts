import type { OnModuleDestroy } from '@nestjs/common';
import { FlowProducer, type Job, Queue } from 'bullmq';
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
  private readonly flows: FlowProducer;

  /** `name` is overridden by the integration tests only. */
  constructor(name: string = MARKET_DATA_QUEUE) {
    this.name = name;
    this.jobs = new Queue(name, { connection: this.connection });
    this.dead = new Queue<DeadLetter>(`${name}-dead`, {
      connection: this.connection,
    });
    this.flows = new FlowProducer({ connection: this.connection });
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
   * Enqueues a job under an id of its own, to run after `delayMs`, unless a
   * job with that id is already there in any state (waiting, done, failed).
   * Returns whether it was added. This is what makes scheduling safe to
   * repeat: every worker start and every close asks for the same ids.
   *
   * "Already there" lasts as long as the job is kept (`JOB_OPTIONS`: a week
   * once done), which is longer than anything asks again.
   */
  async addOnce<Name extends JobName>(
    name: Name,
    data: JobData<Name>,
    jobId: string,
    delayMs = 0,
  ): Promise<boolean> {
    if ((await this.jobs.getJob(jobId)) !== undefined) return false;
    await this.jobs.add(name, data, { ...JOB_OPTIONS, jobId, delay: delayMs });
    return true;
  }

  /**
   * Enqueues `steps` and one job that runs after all of them are over: a
   * BullMQ flow, where the last job is the parent and waits for its
   * children. "Over" includes given up on: a step that fails for good is
   * dead-lettered like any job and stops counting, instead of leaving the
   * parent waiting forever (`ignoreDependencyOnFailure`). With no steps the
   * last job runs at once. All of it is added in one Redis transaction.
   */
  async addThen<Last extends JobName>(
    steps: Array<{ name: JobName; data: JobData }>,
    last: { name: Last; data: JobData<Last> },
  ): Promise<number> {
    await this.flows.add({
      name: last.name,
      queueName: this.name,
      data: last.data,
      opts: JOB_OPTIONS,
      children: steps.map((step) => ({
        name: step.name,
        queueName: this.name,
        data: step.data,
        opts: { ...JOB_OPTIONS, ignoreDependencyOnFailure: true },
      })),
    });
    return steps.length + 1;
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
        'waiting-children',
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
    await this.flows.close();
    await this.connection.quit();
  }
}
