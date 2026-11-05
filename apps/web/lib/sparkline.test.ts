import { sparklineGeometry } from "./sparkline";

describe("sparklineGeometry", () => {
  it("spreads the closes across the box, oldest at the left", () => {
    const { path, end, trend } = sparklineGeometry([10, 20, 15], 100, 40, 0);
    // x: 0, 50, 100. y: 20 is the top (0), 10 the bottom (40), 15 the middle.
    expect(path).toBe("M0 40 L50 0 L100 20");
    expect(end).toEqual({ x: 100, y: 20 });
    expect(trend).toBe("up");
  });

  it("keeps the stroke inside the padding", () => {
    const { path, end } = sparklineGeometry([1, 2], 50, 20, 2);
    expect(path).toBe("M2 18 L48 2");
    expect(end).toEqual({ x: 48, y: 2 });
  });

  it("draws a flat series through the middle instead of dividing by zero", () => {
    const { path, trend } = sparklineGeometry([5, 5, 5], 60, 30, 0);
    expect(path).toBe("M0 15 L30 15 L60 15");
    expect(trend).toBe("flat");
  });

  it("calls a fall a fall and refuses a single close", () => {
    expect(sparklineGeometry([3, 2], 10, 10).trend).toBe("down");
    expect(() => sparklineGeometry([3], 10, 10)).toThrow(RangeError);
  });
});
