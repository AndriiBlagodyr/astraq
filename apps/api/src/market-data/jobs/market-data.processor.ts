import { Injectable } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { fullHistory } from '../history';
import { IngestionService } from '../ingestion.service';
import { MarketDataRepository } from '../market-data.repository';
import { ProviderError } from '../provider/market-data-provider';
import { DataQualityService } from '../quality/data-quality.service';
import { JOB_SCHEMAS, type JobData, type JobName } from './market-data.jobs';
import { SessionScheduler } from './session-scheduler';

/** What a job did, kept on it in Redis and printed in the worker's log. */
export type JobResult = Record<string, number | string>;

/**
 * Runs one market data job: parses its payload and calls what does the
 * work. The three loading jobs touch no Redis, so their work can be tested,
 * and run, without a queue; `session-close` is the one that enqueues.
 *
 * Every job may run more than once (a retry, a worker that died after
 * writing but before reporting), and each is safe to: ingestion upserts
 * bars and replaces a range's corporate actions, so the second run writes
 * nothing the first already did.
 */
@Injectable()
export class MarketDataProcessor {
  constructor(
    private readonly ingestion: IngestionService,
    private readonly repository: MarketDataRepository,
    private readonly scheduler: SessionScheduler,
    private readonly quality: DataQualityService,
  ) {}

  async process(name: string, payload: unknown): Promise<JobResult> {
    if (!(name in JOB_SCHEMAS)) {
      throw new UnrecoverableError(`Unknown job "${name}"`);
    }
    const job = name as JobName;
    switch (job) {
      case 'symbol-backfill': {
        const { ticker } = read(job, payload);
        const [seed] = await this.repository.findSeeds([ticker]);
        if (seed === undefined) {
          throw new UnrecoverableError(`Unknown symbol ${ticker}`);
        }
        const range = fullHistory();
        await this.ingestion.backfill([seed], range);
        return { ticker, ...range };
      }
      case 'eod-refresh': {
        const { tickers, from, to } = read(job, payload);
        const bars = await this.ingestion.refreshBars(tickers, { from, to });
        return { symbols: tickers.length, from, to, bars };
      }
      case 'corporate-actions-refresh': {
        const { tickers, from, to } = read(job, payload);
        const actions = await this.ingestion.refreshCorporateActions(tickers, {
          from,
          to,
        });
        return { symbols: tickers.length, from, to, actions };
      }
      case 'session-close':
        return this.scheduler.close(read(job, payload).session);
      case 'data-quality-check':
        return this.quality.run(read(job, payload).session);
    }
  }
}

/** A job's payload, checked. A payload that doesn't parse never will. */
function read<Name extends JobName>(name: Name, payload: unknown): JobData<Name> {
  const parsed = JOB_SCHEMAS[name].safeParse(payload);
  if (!parsed.success) {
    throw new UnrecoverableError(
      `Invalid payload for ${name}: ${parsed.error.message}`,
    );
  }
  return parsed.data as JobData<Name>;
}

/**
 * Whether trying a failed job again is pointless: the job itself is wrong
 * (`UnrecoverableError`), or the provider refused or answered in a shape
 * the adapter doesn't read (a `ProviderError` that isn't retryable).
 * Anything else, a database that is down or a bug, gets its attempts.
 */
export function isFatal(error: unknown): boolean {
  return (
    error instanceof UnrecoverableError ||
    (error instanceof ProviderError && !error.retryable)
  );
}
