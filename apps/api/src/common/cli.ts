import {
  type INestApplicationContext,
  Logger,
  type Type,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

type CliOptions = {
  /** The logger's context: what the lines of this command are prefixed with. */
  name: string;
  /** The root module: everything the command needs, and nothing that listens. */
  module: Type<unknown>;
  /**
   * Whether a failure prints its stack. On for the commands that load data,
   * where the stack says which step failed; off for the ones whose errors
   * are written for the person typing (a usage line, an unknown ticker).
   */
  trace?: boolean;
};

/**
 * Runs a command-line entry point (`bootstrap`, `symbols:sync`,
 * `calendar:sync`, `jobs`, `archive`): builds the module without an HTTP
 * server, hands it to `work`, and closes it whatever happens, so the
 * database and Redis connections don't keep the process alive. A failure is
 * logged and becomes exit code 1.
 *
 * The worker is not one of these: it stays up until it is told to stop
 * (`jobs/worker.main.ts`).
 */
export function runCli(
  { name, module, trace = false }: CliOptions,
  work: (app: INestApplicationContext, logger: Logger) => Promise<void>,
): void {
  const logger = new Logger(name);
  const run = async () => {
    const app = await NestFactory.createApplicationContext(module, {
      logger: ['log', 'warn', 'error', 'fatal'],
    });
    try {
      await work(app, logger);
    } finally {
      await app.close();
    }
  };
  run().catch((error: unknown) => {
    logger.error(
      error instanceof Error ? (trace ? error.stack : error.message) : error,
    );
    process.exitCode = 1;
  });
}

/** `--tickers nvda, aapl` as `['NVDA', 'AAPL']`; nothing for an absent flag. */
export function parseTickers(argument: string | undefined): string[] {
  return (argument ?? '')
    .split(',')
    .map((ticker) => ticker.trim().toUpperCase())
    .filter(Boolean);
}
