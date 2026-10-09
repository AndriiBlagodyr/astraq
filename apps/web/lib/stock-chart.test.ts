import {
  chartHref,
  lastSession,
  parseChartParams,
  rangeStart,
  sessionChange,
  splitLabel,
} from "./stock-chart";

describe("rangeStart", () => {
  it("counts months back and clamps to the shorter month", () => {
    expect(rangeStart("1M", "2026-03-31")).toBe("2026-02-28");
    expect(rangeStart("1Y", "2024-02-29")).toBe("2023-02-28");
    expect(rangeStart("6M", "2026-10-05")).toBe("2026-04-05");
    expect(rangeStart("5Y", "2026-10-05")).toBe("2021-10-05");
  });

  it("has no start for Max", () => {
    expect(rangeStart("Max", "2026-10-05")).toBeUndefined();
  });
});

describe("parseChartParams", () => {
  it("falls back to 1Y split-adjusted for missing or unknown values", () => {
    expect(parseChartParams({})).toEqual({
      range: "1Y",
      adjustment: "split",
      custom: null,
    });
    expect(parseChartParams({ range: "2W", adjustment: ["raw"] })).toEqual({
      range: "1Y",
      adjustment: "split",
      custom: null,
    });
    expect(parseChartParams({ range: "Max", adjustment: "raw" })).toEqual({
      range: "Max",
      adjustment: "raw",
      custom: null,
    });
  });

  it("reads a valid from/to pair as a custom range, inclusive of one day", () => {
    expect(
      parseChartParams({ range: "1M", from: "2024-05-01", to: "2024-06-28" })
        .custom
    ).toEqual({ from: "2024-05-01", to: "2024-06-28" });
    expect(
      parseChartParams({ from: "2024-06-10", to: "2024-06-10" }).custom
    ).toEqual({ from: "2024-06-10", to: "2024-06-10" });
  });

  it("ignores a half, malformed, impossible, or reversed pair", () => {
    const custom = (params: Record<string, string | string[]>) =>
      parseChartParams(params).custom;
    expect(custom({ from: "2024-05-01" })).toBeNull();
    expect(custom({ from: "2024-5-1", to: "2024-06-28" })).toBeNull();
    expect(custom({ from: "2026-02-30", to: "2026-03-10" })).toBeNull();
    expect(custom({ from: ["2024-05-01"], to: "2024-06-28" })).toBeNull();
    expect(custom({ from: "2024-06-28", to: "2024-05-01" })).toBeNull();
  });
});

describe("chartHref", () => {
  it("links a preset or a custom range with the price mode", () => {
    expect(chartHref("NVDA", { range: "5Y", adjustment: "raw" })).toBe(
      "/stocks/NVDA?range=5Y&adjustment=raw"
    );
    expect(
      chartHref("NVDA", {
        custom: { from: "2024-05-01", to: "2024-06-28" },
        adjustment: "split",
      })
    ).toBe("/stocks/NVDA?from=2024-05-01&to=2024-06-28&adjustment=split");
  });
});

describe("lastSession", () => {
  const bar = (time: string, close: string) => ({
    time,
    open: close,
    high: close,
    low: close,
    close,
    volume: "1",
  });

  it("reports the last close and its change from the previous one", () => {
    expect(
      lastSession([bar("2024-06-07", "120"), bar("2024-06-10", "126")])
    ).toEqual({
      date: "2024-06-10",
      close: "126",
      change: 6,
      changePercent: 5,
    });
  });

  it("has no change for a single bar, and nothing for none", () => {
    expect(lastSession([bar("2024-06-10", "126")])?.change).toBeNull();
    expect(lastSession([])).toBeNull();
  });
});

describe("sessionChange", () => {
  it("measures the change against the split-adjusted previous close", () => {
    expect(
      sessionChange({
        date: "2024-06-10",
        close: "121.79",
        previousClose: "120.888",
      })
    ).toEqual({
      date: "2024-06-10",
      close: "121.79",
      change: expect.closeTo(0.902, 9),
      changePercent: expect.closeTo(0.7461, 4),
    });
  });
});

describe("splitLabel", () => {
  it("names forward and reverse splits by new shares per old", () => {
    expect(splitLabel({ exDate: "2024-06-10", from: "1", to: "10" })).toBe(
      "10-for-1 split"
    );
    expect(splitLabel({ exDate: "2023-01-03", from: "2", to: "3" })).toBe(
      "3-for-2 split"
    );
    expect(splitLabel({ exDate: "2023-01-03", from: "20", to: "1" })).toBe(
      "1-for-20 reverse split"
    );
  });
});
