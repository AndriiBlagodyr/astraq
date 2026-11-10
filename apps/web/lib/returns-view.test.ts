import {
  barLabel,
  binCount,
  histogramLayout,
  parseReturnsParams,
  returnsHref,
} from "./returns-view";

describe("parseReturnsParams", () => {
  it("upper-cases a ticker and falls back to 1Y total return", () => {
    expect(parseReturnsParams({ symbol: " nvda " })).toEqual({
      symbol: "NVDA",
      range: "1Y",
      adjustment: "all",
      custom: null,
    });
  });

  it("reads no symbol from a missing, repeated, or impossible one", () => {
    expect(parseReturnsParams({}).symbol).toBeNull();
    expect(parseReturnsParams({ symbol: ["A", "B"] }).symbol).toBeNull();
    expect(parseReturnsParams({ symbol: "not a ticker" }).symbol).toBeNull();
    expect(parseReturnsParams({ symbol: "BRK.B" }).symbol).toBe("BRK.B");
  });

  it("prefers a valid custom range and keeps the price basis", () => {
    expect(
      parseReturnsParams({
        symbol: "SPY",
        range: "5Y",
        from: "2024-01-01",
        to: "2024-06-30",
        adjustment: "split",
      })
    ).toEqual({
      symbol: "SPY",
      range: "5Y",
      adjustment: "split",
      custom: { from: "2024-01-01", to: "2024-06-30" },
    });
  });
});

describe("returnsHref", () => {
  it("builds preset and custom links that parse back to themselves", () => {
    const preset = returnsHref({
      symbol: "NVDA",
      range: "6M",
      adjustment: "all",
    });
    expect(preset).toBe(
      "/analysis/returns?symbol=NVDA&range=6M&adjustment=all"
    );

    const custom = returnsHref({
      symbol: "NVDA",
      custom: { from: "2024-01-01", to: "2024-02-01" },
      adjustment: "split",
    });
    const params = Object.fromEntries(new URL(custom, "http://x").searchParams);
    expect(parseReturnsParams(params)).toEqual({
      symbol: "NVDA",
      range: "1Y",
      adjustment: "split",
      custom: { from: "2024-01-01", to: "2024-02-01" },
    });
  });
});

describe("histogramLayout", () => {
  // 250 returns from a fixed generator, so the test is deterministic and
  // roughly bell-shaped (a sum of uniforms).
  const returns = Array.from({ length: 250 }, (_, i) => {
    const a = ((i * 7919) % 1000) / 1000;
    const b = ((i * 104729) % 1000) / 1000;
    const c = ((i * 1299709) % 1000) / 1000;
    return (a + b + c - 1.5) * 0.02;
  });
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1)
  );

  it("puts every return in exactly one bar and keeps bars inside the plot", () => {
    const layout = histogramLayout(returns, { mean, stdDev });

    expect(layout.bars.length).toBeGreaterThanOrEqual(8);
    expect(layout.bars.reduce((sum, bar) => sum + bar.count, 0)).toBe(250);
    for (const bar of layout.bars) {
      expect(bar.x).toBeGreaterThanOrEqual(0);
      expect(bar.x + bar.width).toBeLessThanOrEqual(layout.plot.width + 0.5);
      expect(bar.y + bar.height).toBeCloseTo(layout.plot.height);
      expect(bar.height).toBeGreaterThanOrEqual(0);
    }
    // Adjacent bars share edges: the bins tile the data's extent.
    for (let i = 1; i < layout.bars.length; i++) {
      expect(layout.bars[i]!.x0).toBe(layout.bars[i - 1]!.x1);
    }
  });

  it("draws the normal curve and the mean marker only with a spread", () => {
    const withStats = histogramLayout(returns, { mean, stdDev });
    expect(withStats.curve).toMatch(/^M/);
    expect(withStats.meanX).toBeGreaterThan(0);
    expect(withStats.meanX).toBeLessThan(withStats.plot.width);

    const flat = histogramLayout(returns, { mean, stdDev: null });
    expect(flat.curve).toBeNull();
    expect(flat.meanX).not.toBeNull();

    expect(histogramLayout(returns, null).curve).toBeNull();
    expect(histogramLayout(returns, null).meanX).toBeNull();
  });

  it("returns an empty layout for no returns and copes with one value", () => {
    expect(histogramLayout([], null).bars).toEqual([]);

    const single = histogramLayout([0.01], { mean: 0.01, stdDev: null });
    expect(single.bars.reduce((sum, bar) => sum + bar.count, 0)).toBe(1);
    expect(single.bars.every((bar) => Number.isFinite(bar.width))).toBe(true);
  });

  it("scales the bucket count with the square root of the sample", () => {
    expect(binCount(10)).toBe(8);
    expect(binCount(250)).toBe(24);
    expect(binCount(2500)).toBe(60);
  });
});

describe("barLabel", () => {
  it("reads as a range, a day count, and a share", () => {
    const bar = {
      x0: -0.02,
      x1: -0.015,
      count: 7,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };
    expect(barLabel(bar, 250)).toBe("-2% to -1.5%: 7 days (2.8%)");
    expect(barLabel({ ...bar, count: 1 }, 1)).toBe(
      "-2% to -1.5%: 1 day (100.0%)"
    );
  });
});
