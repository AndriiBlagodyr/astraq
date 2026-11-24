import type { ProviderName } from './market-data-provider';
import type { Fetch } from './provider-http';

// Recorded provider responses for the contract tests
// (`provider.contract.spec.ts`), and the two `fetch` stand-ins that make
// and replay them. A fixture holds whole HTTP exchanges, not parsed data:
// the test then runs everything an adapter does, from the URL it builds to
// the numbers it reads out of the body's text.

/** One request and its answer. Headers are not kept: they carry the keys. */
export type Exchange = { url: string; status: number; body: string };

export type Fixture = {
  provider: ProviderName;
  /** When it was recorded. An adapter that reads the clock replays at this instant. */
  recordedAt: string;
  /** How it was made: recorded, or built by hand and from what. */
  source: string;
  exchanges: Exchange[];
};

/**
 * What every fixture records, chosen so one month exercises the contract:
 * Apple around its 4-for-1 split of 2020-08-31, with a dividend that went
 * ex three weeks before it. A provider that adjusts prices gives itself
 * away here. Then a ticker no exchange lists.
 */
export const SCENARIO = {
  ticker: 'AAPL',
  unknownTicker: 'ZZZZQQ',
  range: { from: '2020-08-03', to: '2020-09-04' },
} as const;

/** A `fetch` that passes through and keeps what went by. */
export function recording(real: Fetch, into: Exchange[]): Fetch {
  return async (url, init) => {
    const response = await real(url, init);
    const body = await response.text();
    into.push({ url, status: response.status, body });
    return new Response(body, { status: response.status });
  };
}

/**
 * A `fetch` that answers from recorded exchanges, matched on the exact
 * URL. A request nobody recorded throws: an adapter that starts asking for
 * something else should fail its tests, not quietly reach the network.
 */
export function replaying(exchanges: Exchange[]): Fetch {
  return async (url) => {
    const exchange = exchanges.find((candidate) => candidate.url === url);
    if (exchange === undefined) {
      throw new Error(`No recorded response for ${url}`);
    }
    return new Response(exchange.body, { status: exchange.status });
  };
}
