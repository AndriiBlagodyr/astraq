import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { toIsoDate } from '../../common/dates';
import { BOOTSTRAP_FROM } from '../bootstrap/bootstrap-symbols';
import { BootstrapModule } from '../bootstrap/bootstrap.module';
import { MarketCalendarService } from '../market-calendar.service';

// `pnpm --filter @astraq/api calendar:sync`
// Loads the exchange calendar from the first bootstrapped session to the
// end of next year into `market_sessions`. Idempotent: rerun it to pick up
// a closure announced since. The api server also reloads the year ahead on
// its own when the table runs short, so this is for the history and for a
// first load without waiting for an order.

async function main() {
  const app = await NestFactory.createApplicationContext(BootstrapModule, {
    logger: ['log', 'warn', 'error', 'fatal'],
  });
  try {
    const nextYear = new Date().getUTCFullYear() + 1;
    await app.get(MarketCalendarService).sync({
      from: BOOTSTRAP_FROM,
      to: toIsoDate(new Date(Date.UTC(nextYear, 11, 31))),
    });
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  new Logger('CalendarSync').error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
