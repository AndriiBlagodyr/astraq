import { Injectable } from '@nestjs/common';
import { yesterdayUtc } from '../../common/dates';
import { IngestionService } from '../ingestion.service';
import { MarketDataRepository } from '../market-data.repository';
import {
  ACTION_LOOKBACK_DAYS,
  BAR_OVERLAP_DAYS,
  planRefresh,
} from './market-data.jobs';
import { MarketDataQueue } from './market-data.queue';

/**
 * Turns "refresh everything" into jobs: reads the tracked symbols, cuts
 * them into batches the provider takes in one call (`planRefresh`), and
 * enqueues a job per batch. Called by the `jobs` CLI today; the scheduler
 * that calls it after each close is ROADMAP Phase 4 item 3.
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

  async enqueueEodRefresh(to: string = yesterdayUtc()): Promise<number> {
    return this.queue.add(
      'eod-refresh',
      planRefresh(
        await this.repository.findTrackedSymbols(),
        to,
        this.ingestion.source.batchSize,
        BAR_OVERLAP_DAYS,
      ),
    );
  }

  async enqueueCorporateActionsRefresh(
    to: string = yesterdayUtc(),
  ): Promise<number> {
    return this.queue.add(
      'corporate-actions-refresh',
      planRefresh(
        await this.repository.findTrackedSymbols(),
        to,
        this.ingestion.source.batchSize,
        ACTION_LOOKBACK_DAYS,
      ),
    );
  }
}
