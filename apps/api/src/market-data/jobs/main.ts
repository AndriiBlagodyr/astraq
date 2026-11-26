import 'reflect-metadata';
import { parseArgs } from 'node:util';
import { parseTickers, runCli } from '../../common/cli';
import { JobsModule } from './jobs.module';
import { MarketDataQueue } from './market-data.queue';
import { RefreshService } from './refresh.service';
import { describeClose, SessionScheduler } from './session-scheduler';

// `pnpm --filter @astraq/api jobs <command>`
//
//   backfill --tickers NVDA,AAPL   one symbol-backfill job per ticker
//   eod-refresh [--to YYYY-MM-DD]  the tracked symbols' bars, a job per batch
//   actions-refresh [--to ...]     their splits and dividends
//   quality-check [--to ...]       check the stored bars up to a session
//   schedule                       make sure the next close has its job
//   status                         how many jobs are in each state
//   dead                           the jobs that were given up on, and why
//   retry-dead                     put those back on the queue
//
// Enqueues and exits; `pnpm --filter @astraq/api worker` does the work.

const USAGE =
  'Usage: jobs <backfill --tickers A,B | eod-refresh [--to DATE] | ' +
  'actions-refresh [--to DATE] | quality-check [--to DATE] | schedule | ' +
  'status | dead | retry-dead>';

runCli({ name: 'Jobs', module: JobsModule }, async (app, logger) => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { tickers: { type: 'string' }, to: { type: 'string' } },
  });
  const command = positionals[0];
  if (values.to !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(values.to)) {
    throw new Error('--to takes a date like 2026-11-20');
  }

  const refresh = app.get(RefreshService);
  const queue = app.get(MarketDataQueue);
  switch (command) {
    case 'backfill': {
      const tickers = parseTickers(values.tickers);
      if (tickers.length === 0) throw new Error(USAGE);
      logger.log(`Enqueued ${await refresh.enqueueBackfill(tickers)} jobs`);
      break;
    }
    case 'eod-refresh':
      logger.log(`Enqueued ${await refresh.enqueueEodRefresh(values.to)} jobs`);
      break;
    case 'actions-refresh':
      logger.log(
        `Enqueued ${await refresh.enqueueCorporateActionsRefresh(values.to)} jobs`,
      );
      break;
    case 'quality-check':
      logger.log(`Enqueued ${await refresh.enqueueQualityCheck(values.to)} jobs`);
      break;
    case 'schedule':
      // The worker does this when it starts; this is for looking.
      for (const close of await app.get(SessionScheduler).ensure()) {
        logger.log(describeClose(close));
      }
      break;
    case 'status':
      logger.log(JSON.stringify(await queue.counts()));
      break;
    case 'dead': {
      const dead = await queue.listDead();
      logger.log(`${dead.length} dead letters`);
      for (const letter of dead) {
        logger.log(
          `${letter.failedAt} ${letter.name} ${letter.jobId} after ` +
            `${letter.attempts} attempts: ${letter.error}\n` +
            `  ${JSON.stringify(letter.data)}`,
        );
      }
      break;
    }
    case 'retry-dead':
      logger.log(`Put ${await queue.retryDead()} jobs back on the queue`);
      break;
    default:
      throw new Error(USAGE);
  }
});
