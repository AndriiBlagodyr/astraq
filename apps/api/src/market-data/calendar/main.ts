import 'reflect-metadata';
import { runCli } from '../../common/cli';
import { toIsoDate } from '../../common/dates';
import { HISTORY_FROM } from '../history';
import { MarketCalendarService } from '../market-calendar.service';
import { MarketDataCoreModule } from '../market-data-core.module';

// `pnpm --filter @astraq/api calendar:sync`
// Loads the exchange calendar from the first bootstrapped session to the
// end of next year into `market_sessions`. Idempotent: rerun it to pick up
// a closure announced since. The api server also reloads the year ahead on
// its own when the table runs short, so this is for the history and for a
// first load without waiting for an order.

runCli(
  { name: 'CalendarSync', module: MarketDataCoreModule, trace: true },
  async (app) => {
    const nextYear = new Date().getUTCFullYear() + 1;
    await app.get(MarketCalendarService).sync({
      from: HISTORY_FROM,
      to: toIsoDate(new Date(Date.UTC(nextYear, 11, 31))),
    });
  },
);
