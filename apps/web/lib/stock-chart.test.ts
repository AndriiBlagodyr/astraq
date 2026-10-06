import { lastSession, parseChartParams, rangeStart } from "./stock-chart";

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
    expect(parseChartParams({})).toEqual({ range: "1Y", adjustment: "split" });
    expect(parseChartParams({ range: "2W", adjustment: ["raw"] })).toEqual({
      range: "1Y",
      adjustment: "split",
    });
    expect(parseChartParams({ range: "Max", adjustment: "raw" })).toEqual({
      range: "Max",
      adjustment: "raw",
    });
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
