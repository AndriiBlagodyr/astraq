import 'reflect-metadata';
import { parseArgs } from 'node:util';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { yesterdayUtc } from '../../common/dates';
import { MarketDataRepository } from '../market-data.repository';
import type { SymbolSeed } from '../market-data.types';
import { BOOTSTRAP_FROM, BOOTSTRAP_SYMBOLS } from './bootstrap-symbols';
import { BootstrapModule } from './bootstrap.module';
import { BootstrapService } from './bootstrap.service';

// `pnpm --filter @astraq/api bootstrap [--tickers NVDA,AAPL]`
// Loads daily bars from BOOTSTRAP_FROM through yesterday (UTC) for the
// fixed list, or for any tickers the symbol universe knows (`symbols:sync`).

async function selectSymbols(
  tickersArg: string | undefined,
  repository: MarketDataRepository,
): Promise<SymbolSeed[]> {
  if (!tickersArg) return BOOTSTRAP_SYMBOLS;
  const wanted = tickersArg
    .split(',')
    .map((ticker) => ticker.trim().toUpperCase())
    .filter(Boolean);
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

async function main() {
  const { values } = parseArgs({ options: { tickers: { type: 'string' } } });

  const app = await NestFactory.createApplicationContext(BootstrapModule, {
    logger: ['log', 'warn', 'error', 'fatal'],
  });
  try {
    const symbols = await selectSymbols(
      values.tickers,
      app.get(MarketDataRepository),
    );
    await app
      .get(BootstrapService)
      .run(symbols, { from: BOOTSTRAP_FROM, to: yesterdayUtc() });
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  new Logger('Bootstrap').error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
