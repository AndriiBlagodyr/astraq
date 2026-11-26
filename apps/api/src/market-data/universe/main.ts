import 'reflect-metadata';
import { runCli } from '../../common/cli';
import { MarketDataCoreModule } from '../market-data-core.module';
import { SymbolUniverseService } from './universe.service';

// `pnpm --filter @astraq/api symbols:sync`
// Loads Alpaca's active US equity list into `symbols`. Idempotent: rerun it
// to pick up listings, delistings, and renamed companies.

runCli(
  { name: 'SymbolsSync', module: MarketDataCoreModule, trace: true },
  async (app) => {
    await app.get(SymbolUniverseService).sync();
  },
);
