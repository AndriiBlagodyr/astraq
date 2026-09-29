// @vitest-environment node
import { contrastRatio, parseColor, worstContrast } from "./contrast";
import {
  CONTRAST_MINIMUMS,
  TONE_TINTS,
  backgroundsFor,
  resolveTheme,
} from "./resolve";
import { MODES } from "./schema";
import { THEME_SOURCES } from "./themes";

/**
 * The token build solves colors for contrast; this re-checks the resolved
 * output independently, so a change to a seed, curve, or solver can't ship a
 * pair below the theme's WCAG 2.2 level (AA, or AAA for `contrast`).
 */
describe.each(THEME_SOURCES.map(resolveTheme))("$source.name theme", (theme) => {
  const { text: TEXT_MIN, nonText: NON_TEXT_MIN } =
    CONTRAST_MINIMUMS[theme.source.contrast];

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

    // The brand gradient is the primary button fill: the one place on-brand
    // text sits (solid themes repeat one color across the stops).
    it("fg-on-brand is readable on every brand gradient stop", () => {
      const text = parseColor(tokens["fg-on-brand"]);
      for (const { color } of theme.source.brand.gradient) {
        expect(contrastRatio(text, parseColor(color))).toBeGreaterThanOrEqual(TEXT_MIN);
      }
    });

    it("focus-ring is visible against every surface", () => {
      expect(worstContrast(tokens["focus-ring"], onBackgrounds(NON_TEXT_MIN))).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    });

    it.each(["bg-checked", "border-control"] as const)(
      "%s marks a control against every surface",
      (token) => {
        expect(worstContrast(tokens[token], onBackgrounds(NON_TEXT_MIN))).toBeGreaterThanOrEqual(NON_TEXT_MIN);
      },
    );

    it("fg-on-checked (checkmarks, thumbs) is visible on bg-checked", () => {
      expect(
        contrastRatio(parseColor(tokens["fg-on-checked"]), parseColor(tokens["bg-checked"])),
      ).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    });

    it.each([1, 2, 3, 4, 5, 6, 7, 8] as const)("chart-%i is distinguishable from surfaces", (n) => {
      expect(worstContrast(tokens[`chart-${n}`], onBackgrounds(NON_TEXT_MIN))).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    });

    if (theme.source.contrast === "AAA") {
      it.each(["border-subtle", "border-default", "border-strong"] as const)(
        "%s is a visible edge on every surface",
        (token) => {
          expect(worstContrast(tokens[token], onBackgrounds(NON_TEXT_MIN))).toBeGreaterThanOrEqual(NON_TEXT_MIN);
        },
      );
    }
  });
});
