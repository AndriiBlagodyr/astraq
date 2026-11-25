import 'reflect-metadata';
import { parseArgs } from 'node:util';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module';
import { MarketDataRepository } from '../market-data.repository';
import { RawArchive } from './raw-archive';
import { RawArchiveModule } from './raw-archive.module';
import type { RowDiff } from './replay';
import { ReplayService } from './replay.service';

// `pnpm --filter @astraq/api archive <command>`
//
//   list [--ticker AAPL] [--limit 20]   the newest captures
//   replay <capture id>                 run the adapter over a capture again
//                                       and compare with the stored rows
//
// Reads the raw payload archive (MongoDB) and the database. Needs no
// provider and no keys: a replay never reaches the network. Exits with 1
// when a replay differs from what is stored.

const USAGE =
  'Usage: archive <list [--ticker T] [--limit N] | replay <capture id>>';

@Module({
  imports: [DatabaseModule, RawArchiveModule],
  providers: [MarketDataRepository, ReplayService],
})
class ArchiveCliModule {}

const kb = (bytes: number) => `${Math.ceil(bytes / 1024)} kB`;

function describe(what: string, diff: RowDiff | null): string {
  if (diff === null) return `${what}: not in this capture`;
  return (
    `${what}: ${diff.replayed} replayed, ${diff.identical} identical, ` +
    `${diff.different.length} fields differ, ${diff.missing.length} not stored`
  );
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { ticker: { type: 'string' }, limit: { type: 'string' } },
  });
  const [command, captureId] = positionals;
  const logger = new Logger('Archive');
  const app = await NestFactory.createApplicationContext(ArchiveCliModule, {
    logger: ['log', 'warn', 'error', 'fatal'],
  });
  try {
    const archive = app.get(RawArchive);
    if (!archive.enabled) {
      throw new Error('No archive is configured: set MONGODB_URL');
    }
    switch (command) {
      case 'list': {
        const limit = Number(values.limit ?? 20);
        if (!Number.isInteger(limit) || limit < 1) throw new Error(USAGE);
        const captures = await archive.captures({
          ticker: values.ticker?.toUpperCase(),
          limit,
        });
        logger.log(`${captures.length} captures, newest first`);
        for (const capture of captures) {
          const tickers =
            capture.tickers.length > 4
              ? `${capture.tickers.slice(0, 4).join(',')} +${capture.tickers.length - 4}`
              : capture.tickers.join(',');
          logger.log(
            `${capture.id}  ${capture.fetchedAt.toISOString()}  ` +
              `${capture.provider} ${capture.operation} ${tickers} ` +
              `${capture.from}..${capture.to}  ${capture.exchanges} answers ` +
              `(${capture.statuses.join(',')}), ${kb(capture.bytes)}`,
          );
        }
        break;
      }
      case 'replay': {
        if (captureId === undefined) throw new Error(USAGE);
        const report = await app.get(ReplayService).compare(captureId);
        if (report === null) throw new Error(`No capture ${captureId}`);
        const { call } = report;
        logger.log(
          `${report.provider} ${call.operation}, ${call.range.from} to ` +
            `${call.range.to}, ${report.exchanges} answers`,
        );
        let differs = false;
        for (const ticker of report.tickers) {
          logger.log(
            `${ticker.ticker.padEnd(6)} ` +
              (ticker.stored ? '' : '(not a stored symbol) ') +
              `${describe('bars', ticker.bars)}; ` +
              describe('actions', ticker.actions),
          );
          for (const diff of [ticker.bars, ticker.actions]) {
            if (diff === null) continue;
            differs ||= diff.different.length + diff.missing.length > 0;
            for (const row of diff.different.slice(0, 10)) {
              logger.warn(
                `  ${row.key} ${row.field}: replayed ${row.replayed}, stored ${row.stored}`,
              );
            }
            if (diff.missing.length > 0) {
              logger.warn(`  not stored: ${diff.missing.slice(0, 10).join(', ')}`);
            }
          }
        }
        if (differs) process.exitCode = 1;
        break;
      }
      default:
        throw new Error(USAGE);
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  new Logger('Archive').error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
