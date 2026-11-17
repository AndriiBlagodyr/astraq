import { NotFoundException } from '@nestjs/common';
import type { SymbolsRepository } from './symbols.repository';

/**
 * A ticker from a path or a body as the symbol it names. Tickers are stored
 * upper-case and accepted in any case; one that isn't in the universe is a
 * 404. For services: every endpoint that takes a ticker resolves it here.
 */
export async function resolveTicker(
  symbols: SymbolsRepository,
  rawTicker: string,
): Promise<{ ticker: string; symbolId: number }> {
  const ticker = rawTicker.toUpperCase();
  const symbolId = await symbols.findIdByTicker(ticker);
  if (symbolId === null) {
    throw new NotFoundException(`Unknown symbol ${ticker}`);
  }
  return { ticker, symbolId };
}
