import { describe, expect, it } from "vitest";
import {
  parseRecentStocks,
  RECENT_STOCKS_LIMIT,
  rememberStock,
} from "./recent-stocks";

describe("rememberStock", () => {
  it("puts the newest first and moves a repeat up", () => {
    const recent = [
      { ticker: "AAPL", name: "Apple Inc." },
      { ticker: "NVDA", name: null },
    ];
    expect(
      rememberStock(recent, { ticker: "NVDA", name: "NVIDIA" }).map(
        (stock) => stock.ticker
      )
    ).toEqual(["NVDA", "AAPL"]);
  });

  it("keeps only the newest few", () => {
    let recent = rememberStock([], { ticker: "A0", name: null });
    for (let index = 1; index <= RECENT_STOCKS_LIMIT; index += 1) {
      recent = rememberStock(recent, { ticker: `A${index}`, name: null });
    }
    expect(recent).toHaveLength(RECENT_STOCKS_LIMIT);
    expect(recent[0]?.ticker).toBe(`A${RECENT_STOCKS_LIMIT}`);
    expect(recent.some((stock) => stock.ticker === "A0")).toBe(false);
  });
});

describe("parseRecentStocks", () => {
  it("reads back what was stored", () => {
    const stored = [
      { ticker: "BRK.B", name: "Berkshire Hathaway" },
      { ticker: "MSFT", name: null },
    ];
    expect(parseRecentStocks(JSON.stringify(stored))).toEqual(stored);
  });

  it("drops anything that isn't a ticker, and never throws", () => {
    expect(parseRecentStocks("")).toEqual([]);
    expect(parseRecentStocks("{not json")).toEqual([]);
    expect(parseRecentStocks('{"ticker":"AAPL"}')).toEqual([]);
    expect(
      parseRecentStocks(
        JSON.stringify([
          null,
          "AAPL",
          { ticker: "../login" },
          { ticker: "aapl" },
          { ticker: "AAPL", name: 7 },
          { ticker: "AAPL", name: "again" },
        ])
      )
    ).toEqual([{ ticker: "AAPL", name: null }]);
  });
});
