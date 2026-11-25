import type { components } from "@astraq/sdk";
import { api, apiFailure, fresh } from "./api";
import type { MarketStatus } from "./market-status";
import type { ReturnsAdjustment, ReturnSeries } from "./returns-view";
import type { ChartAdjustment, ChartInterval } from "./stock-chart";

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

/** Whether the US market is trading now, and the session that opens next. */
export async function getMarketStatus(): Promise<MarketStatus> {
  const { data, response } = await api.GET("/api/market/status", fresh);
  if (!data) throw apiFailure("Market status", response.status);
  return data;
}

/** Daily or weekly candles, or null when the API doesn't know the ticker. */
export async function getCandles(
  ticker: string,
  {
    from,
    to,
    adjustment,
    interval,
  }: {
    from?: string;
    to?: string;
    adjustment: ChartAdjustment;
    interval: ChartInterval;
  }
): Promise<CandleSeries | null> {
  const { data, response } = await api.GET("/api/symbols/{ticker}/candles", {
    params: { path: { ticker }, query: { from, to, adjustment, interval } },
    ...fresh,
  });
  if (response.status === 404) return null;
  if (!data) throw apiFailure(`Candles for ${ticker}`, response.status);
  return data;
}

/** Daily returns with their stats, or null when the API doesn't know the ticker. */
export async function getDailyReturns(
  ticker: string,
  {
    from,
    to,
    adjustment,
  }: { from?: string; to?: string; adjustment: ReturnsAdjustment }
): Promise<ReturnSeries | null> {
  const { data, response } = await api.GET("/api/symbols/{ticker}/returns", {
    params: { path: { ticker }, query: { from, to, adjustment } },
    ...fresh,
  });
  if (response.status === 404) return null;
  if (!data) throw apiFailure(`Returns for ${ticker}`, response.status);
  return data;
}
