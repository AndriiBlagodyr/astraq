import { springEasing, springs } from "./springs";

// The easing is generated numbers nobody reads; a sign error or a wrong
// settle bound would only show up as a subtly wrong feel.
describe("springEasing", () => {
  it.each(Object.entries(springs))("%s starts at 0 and settles at 1", (_, preset) => {
    const { points, duration } = springEasing(preset);
    expect(points[0]).toBe(0);
    expect(points.at(-1)).toBe(1);
    expect(Math.abs(points.at(-2)! - 1)).toBeLessThan(0.01);
    expect(Number.parseInt(duration)).toBeGreaterThan(preset.visualDuration * 1000);
  });

  it("never overshoots without bounce", () => {
    const { points } = springEasing(springs.snappy);
    expect(Math.max(...points)).toBeLessThanOrEqual(1);
  });

  it("overshoots with bounce", () => {
    const { points } = springEasing(springs.bouncySubtle);
    expect(Math.max(...points)).toBeGreaterThan(1);
  });
});
