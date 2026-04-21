import { defaultFeaturedSymbol, featuredSymbols, formatSymbol, getFeaturedSymbolParams } from "./stocks";

describe("stocks helpers", () => {
  it("keeps the default featured symbol aligned with the first featured symbol", () => {
    expect(defaultFeaturedSymbol).toBe(featuredSymbols[0]);
  });

  it("returns params for every featured symbol", () => {
    expect(getFeaturedSymbolParams()).toEqual(featuredSymbols.map((symbol) => ({ symbol })));
  });

  it("normalizes symbols to uppercase", () => {
    expect(formatSymbol("nvda")).toBe("NVDA");
  });
});
