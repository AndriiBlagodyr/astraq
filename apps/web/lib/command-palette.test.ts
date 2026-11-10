import { describe, expect, it } from "vitest";
import {
  actionCommands,
  buildPaletteGroups,
  matchScore,
  pageCommands,
  rankCommands,
  RECENT_LIMIT,
  rememberRecent,
  symbolCommand,
  type PaletteCommand,
} from "./command-palette";

const actions = actionCommands({ mode: "dark", nextTheme: "aurora" });

describe("matchScore", () => {
  const watchlists = pageCommands.find((page) => page.label === "Watchlists")!;

  it("matches everything with an empty query", () => {
    expect(matchScore("", watchlists)).toBe(0);
    expect(matchScore("   ", watchlists)).toBe(0);
  });

  it("prefers a label prefix to a word start to a run inside a word", () => {
    const prefix = matchScore("wat", watchlists)!;
    const wordStart = matchScore("mode", actions[0])!; // "Switch to light mode"
    const inside = matchScore("atch", watchlists)!;
    expect(prefix).toBeGreaterThan(wordStart);
    expect(wordStart).toBeGreaterThan(inside);
  });

  it("falls back to the hint and keywords, then to scattered letters", () => {
    const nvidia = symbolCommand({ ticker: "NVDA", name: "NVIDIA Corp" });
    expect(matchScore("nvidia", nvidia)).toBe(50);
    expect(matchScore("dark", actions[0])).toBe(50);
    // n·v·d·a read out of "nvda" in order: a subsequence with no gaps...
    expect(matchScore("nda", nvidia)).toBe(29); // ...skipping one letter.
    expect(matchScore("xyz", nvidia)).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(matchScore("WATCH", watchlists)).toBe(100);
  });
});

describe("rankCommands", () => {
  it("orders by score and keeps the input order between equals", () => {
    const list: PaletteCommand[] = [
      { id: "a", label: "Status" },
      { id: "b", label: "Stocks" },
      { id: "c", label: "Analysis", keywords: ["stats"] },
      { id: "d", label: "Today" },
    ];
    expect(rankCommands("st", list).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("rememberRecent", () => {
  const nvda = symbolCommand({ ticker: "NVDA", name: "NVIDIA" });
  const aapl = symbolCommand({ ticker: "AAPL", name: "Apple" });

  it("puts the latest first and moves a repeat up instead of duplicating", () => {
    const once = rememberRecent([], nvda);
    const twice = rememberRecent(once, aapl);
    const again = rememberRecent(twice, nvda);
    expect(again.map((item) => item.id)).toEqual([
      "symbol:NVDA",
      "symbol:AAPL",
    ]);
  });

  it("keeps at most RECENT_LIMIT items", () => {
    let recent: PaletteCommand[] = [];
    for (let i = 0; i < RECENT_LIMIT + 3; i++) {
      recent = rememberRecent(
        recent,
        symbolCommand({ ticker: `T${i}`, name: `Ticker ${i}` })
      );
    }
    expect(recent).toHaveLength(RECENT_LIMIT);
    expect(recent[0].label).toBe(`T${RECENT_LIMIT + 2}`);
  });

  it("does not remember actions, and strips the shortcut from pages", () => {
    expect(rememberRecent([nvda], actions[0])).toEqual([nvda]);
    const [page] = rememberRecent([], pageCommands[0]);
    expect(page).not.toHaveProperty("shortcut");
    expect(page.href).toBe("/");
  });
});

describe("buildPaletteGroups", () => {
  const recent = [symbolCommand({ ticker: "NVDA", name: "NVIDIA Corp" })];

  it("lists recent items, pages, and actions without a query", () => {
    const groups = buildPaletteGroups({
      query: "",
      recent,
      symbols: [{ ticker: "AAPL", name: "Apple" }],
      actions,
    });
    expect(groups.map((group) => group.value)).toEqual([
      "Recent",
      "Pages",
      "Actions",
    ]);
    expect(groups[1].items).toHaveLength(pageCommands.length);
  });

  it("filters each group by the query and drops empty ones", () => {
    const groups = buildPaletteGroups({
      query: "nv",
      recent,
      symbols: [
        { ticker: "NVDA", name: "NVIDIA Corp" },
        { ticker: "NVO", name: "Novo Nordisk" },
      ],
      actions,
    });
    expect(groups.map((group) => group.value)).toEqual(["Recent", "Symbols"]);
    // NVDA already sits in Recent, so Symbols shows only the other match.
    expect(groups[1].items.map((item) => item.label)).toEqual(["NVO"]);
  });

  it("keeps the server's symbol order rather than re-ranking it", () => {
    const groups = buildPaletteGroups({
      query: "apple",
      recent: [],
      symbols: [
        { ticker: "AAPL", name: "Apple Inc" },
        { ticker: "APLE", name: "Apple Hospitality REIT" },
      ],
      actions,
    });
    expect(groups[0].items.map((item) => item.label)).toEqual(["AAPL", "APLE"]);
  });
});
