import { describe, expect, it } from "vitest";
import {
  createShortcutMatcher,
  isApplePlatform,
  keyLabels,
  SEQUENCE_TIMEOUT_MS,
  shortcuts,
} from "./shortcuts";

describe("createShortcutMatcher", () => {
  it("matches a single key at once", () => {
    const matcher = createShortcutMatcher();
    expect(matcher.press("/", 0)?.id).toBe("search");
    expect(matcher.press("?", 0)?.id).toBe("shortcuts");
  });

  it("completes g then a letter within the timeout", () => {
    const matcher = createShortcutMatcher();
    expect(matcher.press("g", 0)).toBeNull();
    const hit = matcher.press("s", 400);
    expect(hit?.label).toBe("Go to Stocks");
    expect(hit?.href).toBe("/stocks");
  });

  it("drops a prefix once the timeout has passed", () => {
    const matcher = createShortcutMatcher();
    matcher.press("g", 0);
    expect(matcher.press("s", SEQUENCE_TIMEOUT_MS + 1)).toBeNull();
  });

  it("forgets a prefix followed by a key that completes nothing", () => {
    const matcher = createShortcutMatcher();
    matcher.press("g", 0);
    expect(matcher.press("z", 10)).toBeNull();
    // "z" ended the sequence, so this "s" is a plain key, not "g s".
    expect(matcher.press("s", 20)).toBeNull();
  });

  it("ignores chords, which the caller matches from modifier flags", () => {
    const matcher = createShortcutMatcher();
    expect(matcher.press("k", 0)).toBeNull();
  });

  it("resets a pending prefix", () => {
    const matcher = createShortcutMatcher();
    matcher.press("g", 0);
    matcher.reset();
    expect(matcher.press("w", 10)).toBeNull();
  });

  it("has one g-shortcut per sidebar page, with distinct letters", () => {
    const letters = shortcuts
      .filter((shortcut) => shortcut.keys[0] === "g")
      .map((shortcut) => shortcut.keys[1]);
    expect(new Set(letters).size).toBe(letters.length);
    expect(letters.length).toBeGreaterThanOrEqual(5);
  });
});

describe("keyLabels", () => {
  it("shows the Command key on Apple platforms and Ctrl elsewhere", () => {
    expect(keyLabels(["Mod", "k"], { apple: true })).toEqual(["⌘", "K"]);
    expect(keyLabels(["Mod", "k"], { apple: false })).toEqual(["Ctrl", "K"]);
    expect(keyLabels(["g", "s"], { apple: false })).toEqual(["G", "S"]);
  });
});

describe("isApplePlatform", () => {
  it("reads the platform, falling back to the user agent", () => {
    expect(isApplePlatform({ platform: "MacIntel", userAgent: "" })).toBe(true);
    expect(isApplePlatform({ platform: "Win32", userAgent: "" })).toBe(false);
    expect(
      isApplePlatform({ platform: "", userAgent: "Mozilla/5.0 (iPhone; …)" })
    ).toBe(true);
  });
});
