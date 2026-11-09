import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BootstrapModule } from '../bootstrap/bootstrap.module';
import { SymbolUniverseService } from './universe.service';

// `pnpm --filter @astraq/api symbols:sync`
// Loads Alpaca's active US equity list into `symbols`. Idempotent: rerun it
// to pick up listings, delistings, and renamed companies.

async function main() {
  const app = await NestFactory.createApplicationContext(BootstrapModule, {
    logger: ['log', 'warn', 'error', 'fatal'],
  });
  try {
    await app.get(SymbolUniverseService).sync();
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  new Logger('SymbolsSync').error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
