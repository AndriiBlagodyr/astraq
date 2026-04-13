export const featuredSymbols = ["AAPL", "MSFT", "NVDA"] as const;

export const defaultFeaturedSymbol = featuredSymbols[0];

export function getFeaturedSymbolParams() {
  return featuredSymbols.map((symbol) => ({ symbol }));
}

export function formatSymbol(symbol: string) {
  return symbol.toUpperCase();
}
