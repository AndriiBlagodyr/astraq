import { compare, decimal } from '../../common/decimal';
import { toIsoDate } from '../../common/dates';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { AlpacaProvider } from '../alpaca/alpaca.provider';
import type { CandleRow, CorporateActionRow } from '../market-data.types';
import type { CapturedExchange } from '../provider/capture';
import {
  type MarketDataProvider,
  ProviderError,
} from '../provider/market-data-provider';
import type { Fetch } from '../provider/provider-http';
import { YahooProvider } from '../yahoo/yahoo.provider';

// Replaying an archived capture (ROADMAP Phase 4 item 7): the adapter that
// read the provider's answers the first time reads them again, from the
// archive instead of the network. It is the contract tests' mechanism
// (`fixtures.ts`) pointed at what production was actually sent.

/** The adapter asked for something the capture doesn't hold. */
class NotRecorded extends Error {}

function replayFetch(exchanges: CapturedExchange[]): Fetch {
  return async (url) => {
    const exchange = exchanges.find((candidate) => candidate.url === url);
    if (exchange === undefined) throw new NotRecorded(url);
    return new Response(exchange.body, { status: exchange.status });
  };
}

/**
 * The adapter that made these exchanges, set up to make them again: the
 * same host, the same clock, and a `fetch` that answers from the capture.
 * A request it holds no answer for fails; nothing reaches the network.
 */
function replayProvider(exchanges: CapturedExchange[]): MarketDataProvider {
  const [first] = exchanges;
  if (first === undefined) throw new Error('Nothing to replay');
  const url = new URL(first.url);
  const fetch = replayFetch(exchanges);
  const now = () => first.clock;
  if (first.provider === 'yahoo') {
    return new YahooProvider(url.origin, fetch, now);
  }
  // The keys went in headers, which were never stored, and aren't needed:
  // nothing is sent. The feed is part of every bars URL.
  const feed = exchanges
    .map((exchange) => new URL(exchange.url).searchParams.get('feed'))
    .find((value) => value !== null);
  return new AlpacaProvider(
    new AlpacaClient(
      {
        ALPACA_API_KEY_ID: 'replay',
        ALPACA_API_SECRET_KEY: 'replay',
        ALPACA_DATA_URL: url.origin,
        ALPACA_TRADING_URL: url.origin,
        ALPACA_FEED: feed === 'iex' ? 'iex' : 'sip',
      },
      fetch,
      now,
    ),
  );
}

/** What the adapter reads out of a capture. */
export type Replayed = {
  /** Null when the capture doesn't hold the answers bars are read from. */
  bars: Map<string, CandleRow[]> | null;
  /** Null likewise for corporate actions. */
  actions: Map<string, CorporateActionRow[]> | null;
};

/** `work`'s result, or null when it asked for an answer that isn't there. */
async function ifRecorded<Result>(
  work: () => Promise<Result>,
): Promise<Result | null> {
  try {
    return await work();
  } catch (error) {
    // `providerGet` reports a `fetch` that threw as "no answer".
    if (error instanceof ProviderError && error.cause instanceof NotRecorded) {
      return null;
    }
    throw error;
  }
}

/**
 * Runs both halves of the contract over one capture's exchanges, with the
 * tickers and range of the call that made them, and returns whichever the
 * capture can answer. Usually that is the half that was called. Yahoo
 * serves bars and actions from the same responses, so its capture answers
 * both.
 *
 * A capture of a call that failed fails here the same way.
 */
export async function replay(exchanges: CapturedExchange[]): Promise<Replayed> {
  const [first] = exchanges;
  if (first === undefined) return { bars: null, actions: null };
  const provider = replayProvider(exchanges);
  const { tickers, range } = first.call;

  const bars = await ifRecorded(async () => {
    const byTicker = new Map<string, CandleRow[]>();
    for await (const page of provider.dailyBars(tickers, range)) {
      for (const [ticker, rows] of page) {
        byTicker.set(ticker, [...(byTicker.get(ticker) ?? []), ...rows]);
      }
    }
    return byTicker;
  });
  const actions = await ifRecorded(() =>
    provider.corporateActions(tickers, range),
  );
  return { bars, actions };
}

/** A row as its fields' text, under the key that identifies it. */
export type FlatRows = Map<string, Record<string, string | null>>;

export const flatBars = (rows: CandleRow[]): FlatRows =>
  new Map(
    rows.map((row) => [
      toIsoDate(row.ts),
      {
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
      },
    ]),
  );

export const flatActions = (rows: CorporateActionRow[]): FlatRows =>
  new Map(
    rows.map((row): [string, Record<string, string | null>] => [
      `${row.type} ${row.exDate}`,
      row.type === 'SPLIT'
        ? { splitFrom: row.splitFrom, splitTo: row.splitTo }
        : { cashAmount: row.cashAmount, payDate: row.payDate },
    ]),
  );

export type RowDiff = {
  /** Rows the replay produced. */
  replayed: number;
  /** Of those, how many the database holds with every field equal. */
  identical: number;
  /** Rows the database doesn't have, by key. */
  missing: string[];
  /** Fields the database holds a different value for. */
  different: Array<{
    key: string;
    field: string;
    replayed: string | null;
    stored: string | null;
  }>;
};

/** Equal as text, or as numbers: the database writes 1.5 as 1.500000. */
function same(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  try {
    return compare(decimal(a), decimal(b)) === 0;
  } catch {
    return false;
  }
}

/**
 * Compares what a replay produced with what is stored. Only one way: a
 * stored row the replay didn't produce isn't a difference, since the
 * database holds more than one capture's worth.
 */
export function diffRows(replayed: FlatRows, stored: FlatRows): RowDiff {
  const diff: RowDiff = {
    replayed: replayed.size,
    identical: 0,
    missing: [],
    different: [],
  };
  for (const [key, row] of replayed) {
    const other = stored.get(key);
    if (other === undefined) {
      diff.missing.push(key);
      continue;
    }
    const before = diff.different.length;
    for (const [field, value] of Object.entries(row)) {
      const storedValue = other[field] ?? null;
      if (!same(value, storedValue)) {
        diff.different.push({ key, field, replayed: value, stored: storedValue });
      }
    }
    if (diff.different.length === before) diff.identical += 1;
  }
  return diff;
}
