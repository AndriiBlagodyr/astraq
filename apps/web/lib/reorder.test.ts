import { describe, expect, it } from "vitest";
import { dropIndex, moveItem, reorderAnnouncement, stepIndex } from "./reorder";

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];

  it("moves an element down and up, shifting the others", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("returns a copy for a no-op or an index outside the list", () => {
    expect(moveItem(list, 1, 1)).toEqual(list);
    expect(moveItem(list, -1, 2)).toEqual(list);
    expect(moveItem(list, 1, 4)).toEqual(list);
    expect(moveItem(list, 1, 1)).not.toBe(list);
  });
});

describe("dropIndex", () => {
  // Four rows, 40px tall, from y = 0: midpoints at 20, 60, 100, 140.
  const mids = [20, 60, 100, 140];

  it("keeps the row in place while the pointer wobbles around its midpoint", () => {
    expect(dropIndex(mids, 1, 45)).toBe(1);
    expect(dropIndex(mids, 1, 75)).toBe(1);
    expect(dropIndex(mids, 1, 99)).toBe(1);
  });

  it("lands below a row once the pointer passes that row's midpoint going down", () => {
    expect(dropIndex(mids, 0, 61)).toBe(1);
    expect(dropIndex(mids, 0, 101)).toBe(2);
    expect(dropIndex(mids, 0, 500)).toBe(3);
  });

  it("lands above a row once the pointer passes its midpoint going up", () => {
    expect(dropIndex(mids, 3, 99)).toBe(2);
    expect(dropIndex(mids, 3, 19)).toBe(0);
    expect(dropIndex(mids, 2, -50)).toBe(0);
  });

  it("handles an empty list", () => {
    expect(dropIndex([], 0, 10)).toBe(0);
  });
});

describe("stepIndex", () => {
  it("clamps to the list's ends", () => {
    expect(stepIndex(0, -1, 3)).toBe(0);
    expect(stepIndex(2, 1, 3)).toBe(2);
    expect(stepIndex(1, 1, 3)).toBe(2);
  });
});

describe("reorderAnnouncement", () => {
  it("tells the keyboard user what happened and what to do next", () => {
    expect(
      reorderAnnouncement({
        kind: "lift",
        label: "NVDA",
        position: 2,
        count: 5,
      })
    ).toMatch(/^NVDA lifted, position 2 of 5\./);
    expect(
      reorderAnnouncement({
        kind: "drop",
        label: "NVDA",
        position: 1,
        count: 5,
      })
    ).toBe("NVDA dropped at position 1 of 5.");
    expect(reorderAnnouncement({ kind: "cancel", label: "NVDA" })).toBe(
      "NVDA returned to its place."
    );
  });
});
