import { createApiClient, type components } from "@astraq/sdk";
import { env } from "./env";
import type { ChartAdjustment } from "./stock-chart";

// Server-side reads of market data through the generated SDK. Server
// components only: `env` holds server values (see lib/env.ts).

export type SymbolSummary = components["schemas"]["SymbolSummary_Output"];
export type CandleSeries = components["schemas"]["CandleSeries_Output"];

const api = createApiClient(env.API_URL);

// Bars change only when the bootstrap runs; a stale page would hide a run
// that just finished, and these pages render per request anyway.
const fresh = { cache: "no-store" } as const;

function failure(what: string, status: number): Error {
  return new Error(`${what} failed with HTTP ${status}`);
}

export async function searchSymbols(query?: string): Promise<SymbolSummary[]> {
  const { data, response } = await api.GET("/api/symbols", {
    params: { query: query ? { query } : {} },
    ...fresh,
  });
  if (!data) throw failure("Symbol search", response.status);
  return data.symbols;
}

/** The symbol with exactly this ticker, or null. */
export async function findSymbol(
  ticker: string
): Promise<SymbolSummary | null> {
  const symbols = await searchSymbols(ticker);
  return (
    symbols.find((symbol) => symbol.ticker === ticker.toUpperCase()) ?? null
  );
}

/** Daily candles, or null when the API doesn't know the ticker. */
export async function getDailyCandles(
  ticker: string,
  {
    from,
    to,
    adjustment,
  }: { from?: string; to?: string; adjustment: ChartAdjustment }
): Promise<CandleSeries | null> {
  const { data, response } = await api.GET("/api/symbols/{ticker}/candles", {
    params: { path: { ticker }, query: { from, to, adjustment } },
    ...fresh,
  });
  if (response.status === 404) return null;
  if (!data) throw failure(`Candles for ${ticker}`, response.status);
  return data;
}
