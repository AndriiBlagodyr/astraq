import { Injectable } from '@nestjs/common';
import { yesterdayUtc } from '../../common/dates';
import { IngestionService } from '../ingestion.service';
import {
  MarketDataRepository,
  type TrackedSymbol,
} from '../market-data.repository';
import {
  ACTION_LOOKBACK_DAYS,
  BAR_OVERLAP_DAYS,
  planRefresh,
} from './market-data.jobs';
import { MarketDataQueue } from './market-data.queue';

type RefreshJob = 'eod-refresh' | 'corporate-actions-refresh';

/** How far before a batch's stalest bar each kind of refresh starts. */
const LOOKBACK_DAYS: Record<RefreshJob, number> = {
  'eod-refresh': BAR_OVERLAP_DAYS,
  'corporate-actions-refresh': ACTION_LOOKBACK_DAYS,
};

/**
 * Turns "refresh everything" into jobs: reads the tracked symbols, cuts
 * them into batches the provider takes in one call (`planRefresh`), and
 * enqueues a job per batch. Called after each close by the scheduler
 * (`session-scheduler.ts`) and by hand through the `jobs` CLI.
 *
 * `to` is the last session to load, by default yesterday (UTC): the last
 * one whose bar is certainly final.
 */
@Injectable()
export class RefreshService {
  constructor(
    private readonly repository: MarketDataRepository,
    private readonly ingestion: IngestionService,
    private readonly queue: MarketDataQueue,
  ) {}

  /** One `symbol-backfill` job per ticker; a ticker not stored is an error. */
  async enqueueBackfill(tickers: string[]): Promise<number> {
    const known = await this.repository.findSymbolIds(tickers);
    const unknown = tickers.filter((ticker) => !known.has(ticker));
    if (unknown.length > 0) {
      throw new Error(
        `Unknown symbols: ${unknown.join(', ')}. ` +
          'Run `pnpm --filter @astraq/api symbols:sync` first.',
      );
    }
    return this.queue.add(
      'symbol-backfill',
      tickers.map((ticker) => ({ ticker })),
    );
  }

  /**
   * Everything a closed session needs, as one flow: the bars and the
   * corporate actions of the tracked symbols up to `session`, and a data
   * quality check that runs once those are over. Returns how many jobs.
   */
  async enqueueSessionRefresh(session: string): Promise<number> {
    const tracked = await this.repository.findTrackedSymbols();
    const batches = (name: RefreshJob) =>
      this.plan(name, session, tracked).map((data) => ({ name, data }));
    return this.queue.addThen(
      [...batches('eod-refresh'), ...batches('corporate-actions-refresh')],
      { name: 'data-quality-check', data: { session } },
    );
  }

  /** One `data-quality-check` job, for a check asked for by hand. */
  async enqueueQualityCheck(session: string = yesterdayUtc()): Promise<number> {
    return this.queue.add('data-quality-check', [{ session }]);
  }

  async enqueueEodRefresh(to: string = yesterdayUtc()): Promise<number> {
    return this.queue.add(
      'eod-refresh',
      this.plan('eod-refresh', to, await this.repository.findTrackedSymbols()),
    );
  }

  async enqueueCorporateActionsRefresh(
    to: string = yesterdayUtc(),
  ): Promise<number> {
    return this.queue.add(
      'corporate-actions-refresh',
      this.plan(
        'corporate-actions-refresh',
        to,
        await this.repository.findTrackedSymbols(),
      ),
    );
  }

  /**
   * The payloads of one kind of refresh up to `to`: `tracked` in batches
   * the provider takes in one call, each reaching back as far as that kind
   * needs.
   */
  private plan(name: RefreshJob, to: string, tracked: TrackedSymbol[]) {
    return planRefresh(
      tracked,
      to,
      this.ingestion.source.batchSize,
      LOOKBACK_DAYS[name],
    );
  }
}
