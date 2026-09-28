// @vitest-environment node
import { contrastRatio, parseColor, worstContrast } from "./contrast";
import {
  NON_TEXT_MIN,
  TEXT_MIN,
  TONE_TINTS,
  backgroundsFor,
  resolveTheme,
} from "./resolve";
import { MODES } from "./schema";
import { THEME_SOURCES } from "./themes";

/**
 * The token build solves colors for contrast; this re-checks the resolved
 * output independently, so a change to a seed, curve, or solver can't ship a
 * pair below WCAG 2.2 AA.
 */
describe.each(THEME_SOURCES.map(resolveTheme))("$source.name theme", (theme) => {
  describe.each(MODES)("%s mode", (mode) => {
    const { tokens, surfaceGradient } = theme.modes[mode];
    const backgrounds = backgroundsFor(tokens, surfaceGradient);
    const onBackgrounds = (min: number) => ({ backgrounds, min });

    it.each(["fg-default", "fg-muted", "fg-subtle", "chart-axis"] as const)(
      "%s is readable text on every surface",
      (token) => {
        expect(worstContrast(tokens[token], onBackgrounds(TEXT_MIN))).toBeGreaterThanOrEqual(TEXT_MIN);
      },
    );

    it.each(["brand", "brand-strong", "positive", "negative", "warning"] as const)(
      "%s-fg is readable on surfaces and on its own tints",
      (tone) => {
        const check = { ...onBackgrounds(TEXT_MIN), tintColor: tokens[tone], tints: TONE_TINTS };
        expect(worstContrast(tokens[`${tone}-fg`], check)).toBeGreaterThanOrEqual(TEXT_MIN);
      },
    );

    it("fg-on-brand is readable on the brand fill and every gradient stop", () => {
      const text = parseColor(tokens["fg-on-brand"]);
      const fills = [
        tokens.brand,
        ...theme.source.brand.gradient.map((stop) => stop.color),
      ];
      for (const fill of fills) {
        expect(contrastRatio(text, parseColor(fill))).toBeGreaterThanOrEqual(TEXT_MIN);
      }
    });

    it("focus-ring is visible against every surface", () => {
      expect(worstContrast(tokens["focus-ring"], onBackgrounds(NON_TEXT_MIN))).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    });

    it.each([1, 2, 3, 4, 5, 6, 7, 8] as const)("chart-%i is distinguishable from surfaces", (n) => {
      expect(worstContrast(tokens[`chart-${n}`], onBackgrounds(NON_TEXT_MIN))).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    });
  });
});
