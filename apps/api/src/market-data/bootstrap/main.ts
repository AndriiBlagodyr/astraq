import 'reflect-metadata';
import { parseArgs } from 'node:util';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BOOTSTRAP_FROM, BOOTSTRAP_SYMBOLS } from './bootstrap-symbols';
import { BootstrapModule } from './bootstrap.module';
import { BootstrapService } from './bootstrap.service';

// `pnpm --filter @astraq/api bootstrap [--tickers NVDA,AAPL]`
// Loads daily bars from BOOTSTRAP_FROM through yesterday (UTC).

function selectSymbols(tickersArg: string | undefined) {
  if (!tickersArg) return BOOTSTRAP_SYMBOLS;
  const wanted = tickersArg
    .split(',')
    .map((ticker) => ticker.trim().toUpperCase())
    .filter(Boolean);
  const unknown = wanted.filter(
    (ticker) => !BOOTSTRAP_SYMBOLS.some((symbol) => symbol.ticker === ticker),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Not in the bootstrap list: ${unknown.join(', ')}. ` +
        'Add them to bootstrap-symbols.ts first.',
    );
  }
  return BOOTSTRAP_SYMBOLS.filter((symbol) => wanted.includes(symbol.ticker));
}

function yesterdayUtc(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const { values } = parseArgs({ options: { tickers: { type: 'string' } } });
  const symbols = selectSymbols(values.tickers);

  const app = await NestFactory.createApplicationContext(BootstrapModule, {
    logger: ['log', 'warn', 'error', 'fatal'],
  });
  try {
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
