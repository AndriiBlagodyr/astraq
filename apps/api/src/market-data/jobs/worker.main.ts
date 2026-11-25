import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IngestionService } from '../ingestion.service';
import { WorkerModule } from './jobs.module';
import { SessionScheduler } from './session-scheduler';

// `pnpm --filter @astraq/api worker`
// Works the market data queue until stopped, and keeps the refresh after
// each close scheduled. Needs Redis, the database, and a provider (Alpaca
// keys, or MARKET_DATA_PROVIDER=yahoo).

async function main() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'warn', 'error', 'fatal'],
  });
  // Fail at start, not on the first job: a worker without a provider would
  // dead-letter everything it is given.
  const provider = app.get(IngestionService).source;
  const logger = new Logger('Worker');
  logger.log(`Loading from ${provider.name}`);
  // Starts the chain of `session-close` jobs, or repairs it: a close this
  // worker was down for runs now.
  for (const close of await app.get(SessionScheduler).ensure()) {
    logger.log(
      `Session ${close.session}: refresh ` +
        (close.added ? `scheduled for ${close.runsAt}` : 'already scheduled or done'),
    );
  }
  // SIGTERM and Ctrl+C close the worker first: a job in flight finishes.
  app.enableShutdownHooks();
}

main().catch((error: unknown) => {
  new Logger('Worker').error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
