import type { components } from "@astraq/sdk";
import { api, apiFailure, fresh } from "./api";
import type { ChartAdjustment } from "./stock-chart";

// Server-side reads of market data through the generated SDK. Server
// components only, like lib/api.ts.

export type SymbolSummary = components["schemas"]["SymbolSummary_Output"];
export type CandleSeries = components["schemas"]["CandleSeries_Output"];

export async function searchSymbols(query?: string): Promise<SymbolSummary[]> {
  const { data, response } = await api.GET("/api/symbols", {
    params: { query: query ? { query } : {} },
    ...fresh,
  });
  if (!data) throw apiFailure("Symbol search", response.status);
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
  if (!data) throw apiFailure(`Candles for ${ticker}`, response.status);
  return data;
}
