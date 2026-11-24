import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { loadAlpacaEnv } from '../alpaca/alpaca.env';
import { AlpacaProvider } from '../alpaca/alpaca.provider';
import { YahooProvider } from '../yahoo/yahoo.provider';
import { type Exchange, type Fixture, recording, SCENARIO } from './fixtures';
import type { MarketDataProvider } from './market-data-provider';
import { parseProviderEnv } from './provider.env';

// `pnpm --filter @astraq/api fixtures:record --provider yahoo|alpaca`
// Runs the contract scenario against the live provider and writes what
// went over the wire to src/market-data/provider/fixtures/<provider>.json.
// Read the diff before committing it: a changed response is news.

async function main() {
  const { values } = parseArgs({ options: { provider: { type: 'string' } } });
  const exchanges: Exchange[] = [];
  const fetch = recording(globalThis.fetch, exchanges);
  const recordedAt = new Date();

  let provider: MarketDataProvider;
  if (values.provider === 'alpaca') {
    provider = new AlpacaProvider(new AlpacaClient(loadAlpacaEnv(), fetch));
  } else if (values.provider === 'yahoo') {
    const env = parseProviderEnv(process.env);
    if (!env.success) throw env.error;
    provider = new YahooProvider(
      env.data.YAHOO_CHART_URL,
      fetch,
      () => recordedAt,
    );
  } else {
    throw new Error('Usage: fixtures:record --provider yahoo|alpaca');
  }

  for (const ticker of [SCENARIO.ticker, SCENARIO.unknownTicker]) {
    let bars = 0;
    for await (const page of provider.dailyBars([ticker], SCENARIO.range)) {
      bars += page.get(ticker)?.length ?? 0;
    }
    const actions = await provider.corporateActions([ticker], SCENARIO.range);
    console.log(
      `${ticker}: ${bars} bars, ${actions.get(ticker)?.length ?? 0} actions`,
    );
  }

  const fixture: Fixture = {
    provider: provider.name,
    recordedAt: recordedAt.toISOString(),
    source: 'Recorded from the live endpoint by fixtures:record.',
    exchanges,
  };
  const path = join(
    'src/market-data/provider/fixtures',
    `${provider.name}.json`,
  );
  writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`Wrote ${exchanges.length} exchanges to ${path}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
