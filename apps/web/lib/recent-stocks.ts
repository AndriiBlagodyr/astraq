// The stocks you opened last, for Today's "Recently viewed" (docs/ui-plan.md
// § Today, Phase 2). The list lives in the browser's localStorage, so these
// helpers are pure: the component in app/components/RecentStocks.tsx does
// the reading and writing.

export type RecentStock = {
  ticker: string;
  /** The company name when the stock page had it. */
  name: string | null;
};

export const RECENT_STOCKS_LIMIT = 8;

// The api's ticker shape (packages/shared TickerParamSchema), upper-cased.
const tickerPattern = /^[A-Z][A-Z0-9.-]{0,15}$/;

/**
 * `stock` becomes the most recent; a repeat moves to the front instead of
 * appearing twice, and the list keeps the newest `RECENT_STOCKS_LIMIT`.
 */
export function rememberStock(
  recent: readonly RecentStock[],
  stock: RecentStock
): RecentStock[] {
  return [
    stock,
    ...recent.filter((item) => item.ticker !== stock.ticker),
  ].slice(0, RECENT_STOCKS_LIMIT);
}

/**
 * The stored list, or what can be saved of it. Storage is the user's to
 * edit and survives app versions, so anything that isn't a ticker with an
 * optional name is dropped rather than rendered as a link.
 */
export function parseRecentStocks(raw: string): RecentStock[] {
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const stocks: RecentStock[] = [];
  for (const item of parsed as unknown[]) {
    if (typeof item !== "object" || item === null) continue;
    const { ticker, name } = item as { ticker?: unknown; name?: unknown };
    if (typeof ticker !== "string" || !tickerPattern.test(ticker)) continue;
    if (stocks.some((stock) => stock.ticker === ticker)) continue;
    stocks.push({
      ticker,
      name: typeof name === "string" && name ? name.slice(0, 120) : null,
    });
  }
  return stocks.slice(0, RECENT_STOCKS_LIMIT);
}
