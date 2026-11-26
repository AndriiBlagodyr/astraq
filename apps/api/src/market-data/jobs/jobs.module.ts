import { Module } from '@nestjs/common';
import { MarketDataCoreModule } from '../market-data-core.module';
import { MarketDataProcessor } from './market-data.processor';
import { MarketDataQueue } from './market-data.queue';
import { MarketDataWorker } from './market-data.worker';
import { RefreshService } from './refresh.service';
import { SessionScheduler } from './session-scheduler';

/**
 * The producing side: the queue and what enqueues on it, by hand (the
 * `jobs` CLI) and after each close (`SessionScheduler`).
 */
@Module({
  imports: [MarketDataCoreModule],
  providers: [
    { provide: MarketDataQueue, useFactory: () => new MarketDataQueue() },
    RefreshService,
    SessionScheduler,
  ],
  exports: [
    MarketDataQueue,
    RefreshService,
    SessionScheduler,
    MarketDataCoreModule,
  ],
})
export class JobsModule {}

/**
 * The consuming side: the worker process's root module (`worker.main.ts`).
 * A process of its own, not part of the api server: a long backfill then
 * can't slow a request, and the two restart independently.
 */
@Module({
  imports: [JobsModule],
  providers: [
    MarketDataProcessor,
    {
      provide: MarketDataWorker,
      inject: [MarketDataQueue, MarketDataProcessor],
      useFactory: (queue: MarketDataQueue, processor: MarketDataProcessor) =>
        new MarketDataWorker(queue, (name, payload) =>
          processor.process(name, payload),
        ),
    },
  ],
})
export class WorkerModule {}
