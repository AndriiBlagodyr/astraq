import 'reflect-metadata';
import { parseArgs } from 'node:util';
import { parseTickers, runCli } from '../../common/cli';
import { fullHistory } from '../history';
import { IngestionService } from '../ingestion.service';
import { MarketDataCoreModule } from '../market-data-core.module';
import { MarketDataRepository } from '../market-data.repository';
import type { SymbolSeed } from '../market-data.types';
import { BOOTSTRAP_SYMBOLS } from './bootstrap-symbols';

// `pnpm --filter @astraq/api bootstrap [--tickers NVDA,AAPL]`
// Loads daily bars from HISTORY_FROM through yesterday (UTC) for the
// fixed list, or for any tickers the symbol universe knows (`symbols:sync`).

async function selectSymbols(
  tickersArg: string | undefined,
  repository: MarketDataRepository,
): Promise<SymbolSeed[]> {
  const wanted = parseTickers(tickersArg);
  if (wanted.length === 0) return BOOTSTRAP_SYMBOLS;
  // The fixed list wins for a ticker in both: same data, hand-checked name.
  const seeds = [
    ...BOOTSTRAP_SYMBOLS.filter((symbol) => wanted.includes(symbol.ticker)),
    ...(await repository.findSeeds(wanted)),
  ];
  const unknown = wanted.filter(
    (ticker) => !seeds.some((seed) => seed.ticker === ticker),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown symbols: ${unknown.join(', ')}. ` +
        'Run `pnpm --filter @astraq/api symbols:sync` first.',
    );
  }
  return wanted.map((ticker) => seeds.find((seed) => seed.ticker === ticker)!);
}

runCli(
  { name: 'Bootstrap', module: MarketDataCoreModule, trace: true },
  async (app) => {
    const { values } = parseArgs({ options: { tickers: { type: 'string' } } });
    const symbols = await selectSymbols(
      values.tickers,
      app.get(MarketDataRepository),
    );
    await app.get(IngestionService).backfill(symbols, fullHistory());
  },
);
