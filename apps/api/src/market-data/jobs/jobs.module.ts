import { Module } from '@nestjs/common';
import { BootstrapModule } from '../bootstrap/bootstrap.module';
import { MarketDataProcessor } from './market-data.processor';
import { MarketDataQueue } from './market-data.queue';
import { MarketDataWorker } from './market-data.worker';
import { RefreshService } from './refresh.service';

/** The producing side: the queue and what enqueues on it (the `jobs` CLI). */
@Module({
  imports: [BootstrapModule],
  providers: [
    { provide: MarketDataQueue, useFactory: () => new MarketDataQueue() },
    RefreshService,
  ],
  exports: [MarketDataQueue, RefreshService, BootstrapModule],
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
