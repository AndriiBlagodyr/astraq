import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { DateRange } from '../market-data.types';
import type { ProviderName } from './market-data-provider';
import type { Fetch } from './provider-http';

// Capturing what a provider answered (ROADMAP Phase 4 item 7, ADR 0011).
//
// An adapter makes its HTTP requests several calls below the code that
// knows what they are for: `IngestionService` asks for "AAPL's bars over
// this range" and the Alpaca client turns that into pages. The archive
// needs both halves, the bytes and the question. Passing the question down
// through the contract would put archiving into every adapter, so it
// travels beside the call instead, in an `AsyncLocalStorage`: whatever
// runs inside `capturing(...)`, however deep and however many awaits
// later, sees the same scope. Outside one, the wrapped `fetch` and the
// clock are the plain ones.

/** One call on the provider contract: what the answers are answers to. */
export type CaptureCall = {
  operation: 'dailyBars' | 'corporateActions';
  tickers: string[];
  range: DateRange;
};

/** One HTTP exchange made inside a capture. */
export type CapturedExchange = {
  provider: ProviderName;
  /** The same for every exchange of one call. */
  captureId: string;
  /** The order the answers came in, from 0. */
  seq: number;
  call: CaptureCall;
  /** The clock the adapter read during the call (see `captureClock`). */
  clock: Date;
  url: string;
  status: number;
  /** The answer as it came, unparsed: its numbers are still their text. */
  body: string;
  fetchedAt: Date;
};

type Scope = {
  id: string;
  call: CaptureCall;
  clock: Date;
  seq: number;
  sink: (exchange: CapturedExchange) => void;
};

const scopes = new AsyncLocalStorage<Scope>();

/**
 * Runs `work` as one capture: every answer a `capturingFetch` gets while
 * it runs is handed to `sink` with `call` attached. `sink` is called
 * synchronously and must not throw; what it does with the exchange (and
 * whether that fails) is its own business, never the caller's.
 */
export function capturing<Result>(
  call: CaptureCall,
  sink: (exchange: CapturedExchange) => void,
  work: () => Promise<Result>,
): Promise<Result> {
  return scopes.run(
    { id: randomUUID(), call, clock: new Date(), seq: 0, sink },
    work,
  );
}

/**
 * The time, for an adapter that puts it into a request (Alpaca's bars end
 * no later than 16 minutes ago; Yahoo asks for splits "until tomorrow").
 * Inside a capture it stands still at the moment the capture began, so a
 * replay that sets its clock to that moment builds the same URLs.
 */
export function captureClock(): Date {
  return scopes.getStore()?.clock ?? new Date();
}

/** No body is allowed on these, and `new Response` refuses one. */
const BODILESS = new Set([204, 205, 304]);

/**
 * A `fetch` that reports each answer to the capture it is made in, and is
 * `real` when there is none. Every answer is reported, failures too: what
 * a provider said when it refused is worth as much as a page of bars.
 *
 * The body is read here, so the caller gets a copy of the response. A
 * request that gets no answer at all (a timeout, a reset) throws as before
 * and leaves nothing behind.
 */
export function capturingFetch(provider: ProviderName, real: Fetch): Fetch {
  return async (url, init) => {
    const response = await real(url, init);
    const scope = scopes.getStore();
    if (scope === undefined) return response;

    const body = await response.text();
    scope.sink({
      provider,
      captureId: scope.id,
      seq: scope.seq++,
      call: scope.call,
      clock: scope.clock,
      url,
      status: response.status,
      body,
      fetchedAt: new Date(),
    });
    return new Response(BODILESS.has(response.status) ? null : body, {
      status: response.status,
      headers: response.headers,
    });
  };
}
