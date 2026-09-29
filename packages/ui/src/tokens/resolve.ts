/**
 * Seeds -> semantic tokens, per theme and mode.
 *
 * Neutrals come from a hue-tinted 12-step scale. Text, focus, and chart colors
 * start from the theme's seeds and are then solved for contrast against the
 * surfaces they actually appear on (see `ensureContrast`), so every theme
 * passes WCAG AA by construction.
 */

import { alpha, hexToOklch, oklchToHex } from "./color";
import {
  composite,
  ensureContrast,
  parseColor,
  type ContrastCheck,
} from "./contrast";
import { accentScale, neutralScale, step } from "./scale";
import type {
  ContrastLevel,
  Mode,
  ModeTokens,
  ResolvedTheme,
  SurfaceStyle,
  ThemeSource,
  ThemeToken,
} from "./schema";

/** Tints components put behind tone-colored text (feedback 8% ... pressed danger 24%). */
export const TONE_TINTS = [0.08, 0.1, 0.12, 0.18, 0.24];

/** Minimum contrast ratios per WCAG level: text, and non-text (focus, charts, borders). */
export const CONTRAST_MINIMUMS: Record<ContrastLevel, { text: number; nonText: number }> = {
  AA: { text: 4.5, nonText: 3 },
  AAA: { text: 7, nonText: 4.5 },
};
/** Solve slightly above the bar so hex rounding never lands a hair under it. */
const SOLVE_MARGIN = 0.1;

type Surfaces = {
  canvas: string;
  subtle: string;
  surface: string;
  raised: string;
  sunken: string;
  overlay: string;
  surfaceGradient: [string, string];
};

function surfacesFor(
  mode: Mode,
  n: ReturnType<typeof neutralScale>,
  style: SurfaceStyle,
): Surfaces {
  if (style !== "glass") {
    // Solid surfaces: the same steps as glass, without the transparency. The
    // card "gradient" is a single color, so text checks see one stop.
    return mode === "dark"
      ? {
          canvas: step(n, 1),
          subtle: step(n, 2),
          surface: step(n, 2),
          raised: step(n, 3),
          sunken: step(n, 1),
          overlay: alpha(step(n, 1), 0.78),
          surfaceGradient: [step(n, 2), step(n, 2)],
        }
      : {
          canvas: step(n, 2),
          subtle: step(n, 3),
          surface: step(n, 1),
          raised: step(n, 1),
          sunken: step(n, 2),
          overlay: alpha(step(n, 12), 0.36),
          surfaceGradient: [step(n, 1), step(n, 1)],
        };
  }
  // Light UIs float near-white cards on a tinted canvas; dark UIs step up in
  // lightness from the canvas. Opacity keeps the glass look over gradients.
  return mode === "dark"
    ? {
        canvas: step(n, 1),
        subtle: step(n, 2),
        surface: alpha(step(n, 2), 0.82),
        raised: alpha(step(n, 3), 0.94),
        sunken: alpha(step(n, 2), 0.6),
        overlay: alpha(step(n, 1), 0.78),
        surfaceGradient: [alpha(step(n, 1), 0.9), alpha(step(n, 3), 0.76)],
      }
    : {
        canvas: step(n, 2),
        subtle: step(n, 3),
        surface: alpha(step(n, 1), 0.84),
        raised: alpha(step(n, 2), 0.96),
        sunken: alpha(step(n, 1), 0.74),
        overlay: alpha(step(n, 1), 0.86),
        surfaceGradient: [alpha(step(n, 1), 0.88), alpha(step(n, 2), 0.74)],
      };
}

/**
 * Every opaque color text can end up on: the canvas, plus each translucent
 * surface flattened over it (and inputs inside cards).
 */
export function backgroundsFor(tokens: Pick<ModeTokens, "bg-canvas" | "bg-subtle" | "bg-surface" | "bg-raised" | "bg-sunken">, surfaceGradient: readonly string[]) {
  const canvas = parseColor(tokens["bg-canvas"]);
  const surface = composite(parseColor(tokens["bg-surface"]), canvas);
  return [
    canvas,
    parseColor(tokens["bg-subtle"]),
    surface,
    composite(parseColor(tokens["bg-raised"]), canvas),
    composite(parseColor(tokens["bg-sunken"]), canvas),
    composite(parseColor(tokens["bg-sunken"]), surface),
    ...surfaceGradient.map((color) => composite(parseColor(color), canvas)),
  ];
}

function resolveMode(theme: ThemeSource, mode: Mode) {
  const dark = mode === "dark";
  const toward = dark ? "lighter" : "darker";
  const n = neutralScale(mode, theme.neutral);
  const s = surfacesFor(mode, n, theme.surfaces);
  const { brand, status } = theme;
  const glass = theme.surfaces === "glass";
  const minimums = CONTRAST_MINIMUMS[theme.contrast];

  const backgrounds = backgroundsFor(
    {
      "bg-canvas": s.canvas,
      "bg-subtle": s.subtle,
      "bg-surface": s.surface,
      "bg-raised": s.raised,
      "bg-sunken": s.sunken,
    },
    s.surfaceGradient,
  );
  const text: ContrastCheck = { backgrounds, min: minimums.text + SOLVE_MARGIN };
  const solveText = (hex: string) => ensureContrast(hex, toward, text);
  // Tone text also has to read on its own tinted fill (badges, danger buttons).
  const solveTone = (hex: string) =>
    ensureContrast(hex, toward, { ...text, tintColor: hex, tints: TONE_TINTS });
  const solveNonText = (hex: string) =>
    ensureContrast(hex, toward, {
      backgrounds,
      min: minimums.nonText + SOLVE_MARGIN,
    });

  // Borders use a slightly bluer, more chromatic tint than the neutrals so
  // hairlines read as edges rather than gray smudges.
  const edge = oklchToHex({
    l: dark ? 0.77 : 0.585,
    c: 0.115 * theme.neutral.chroma,
    h: theme.neutral.hue + 10,
  });
  // AAA borders are solid and solved like any other non-text UI color;
  // AA hairlines stay translucent.
  const borders =
    theme.contrast === "AAA"
      ? {
          subtle: solveNonText(step(n, 8)),
          default: solveNonText(step(n, 9)),
          strong: solveNonText(step(n, 11)),
        }
      : {
          subtle: alpha(edge, dark ? 0.08 : 0.1),
          default: alpha(edge, 0.14),
          strong: alpha(edge, 0.26),
        };
  const shadowInk = oklchToHex({
    l: dark ? 0.12 : 0.36,
    c: (dark ? 0.03 : 0.07) * theme.neutral.chroma,
    h: theme.neutral.hue,
  });

  // Categorical chart hues: evenly spaced around the wheel from the brand hue.
  const brandHue = hexToOklch(brand.base).h;
  const charts = Array.from({ length: 8 }, (_, i) =>
    solveNonText(
      oklchToHex({
        l: dark ? 0.76 : 0.58,
        c: dark ? 0.14 : 0.15,
        h: (brandHue + i * 45) % 360,
      }),
    ),
  );

  const gradient = (stops: ThemeSource["brand"]["gradient"]) =>
    stops.map((stop) => `${stop.color} ${stop.at}%`).join(", ");

  const tokens: ModeTokens = {
    "bg-canvas": s.canvas,
    "bg-subtle": s.subtle,
    "bg-surface": s.surface,
    "bg-raised": s.raised,
    "bg-sunken": s.sunken,
    "bg-overlay": s.overlay,
    "fg-default": solveText(step(n, 12)),
    "fg-muted": solveText(step(n, 11)),
    "fg-subtle": solveText(step(n, dark ? 10 : 9)),
    "fg-on-brand": brand.onBrand,
    "border-subtle": borders.subtle,
    "border-default": borders.default,
    "border-strong": borders.strong,
    "focus-ring": solveNonText(dark ? brand.base : brand.strong),
    "focus-halo": alpha(dark ? brand.base : brand.strong, dark ? 0.42 : 0.34),
    brand: brand.base,
    "brand-strong": brand.strong,
    "brand-warm": brand.warm,
    "brand-fg": solveTone(brand.base),
    "brand-strong-fg": solveTone(brand.strong),
    positive: status.positive,
    "positive-fg": solveTone(status.positive),
    negative: status.negative,
    "negative-fg": solveTone(status.negative),
    warning: status.warning,
    "warning-fg": solveTone(status.warning),
    "chart-1": charts[0],
    "chart-2": charts[1],
    "chart-3": charts[2],
    "chart-4": charts[3],
    "chart-5": charts[4],
    "chart-6": charts[5],
    "chart-7": charts[6],
    "chart-8": charts[7],
    "chart-grid": alpha(edge, dark ? 0.12 : 0.16),
    "chart-axis": solveText(step(n, dark ? 10 : 9)),
    "shadow-soft": shadowFor(theme.surfaces, dark, shadowInk),
    "shadow-brand": glass
      ? `0 18px 44px ${alpha(brand.strong, dark ? 0.28 : 0.2)}`
      : "none",
    "gradient-brand": `linear-gradient(135deg, ${gradient(brand.gradient)})`,
    // Solid themes keep these as images so `bg-[image:...]` still works.
    "gradient-page": glass
      ? [
          `radial-gradient(circle at 12% 18%, ${alpha(brand.base, 0.12)}, transparent 28%)`,
          `radial-gradient(circle at 82% 12%, ${alpha(brand.warm, 0.1)}, transparent 24%)`,
          `linear-gradient(160deg, ${s.canvas} 0%, ${step(n, 3)} 56%, ${s.canvas} 100%)`,
        ].join(", ")
      : `linear-gradient(${s.canvas}, ${s.canvas})`,
    "gradient-surface": glass
      ? [
          `radial-gradient(circle at top right, ${alpha(brand.strong, dark ? 0.14 : 0.12)}, transparent 32%)`,
          `linear-gradient(180deg, ${s.surfaceGradient[0]}, ${s.surfaceGradient[1]})`,
        ].join(", ")
      : `linear-gradient(${s.surface}, ${s.surface})`,
  };

  return {
    tokens,
    surfaceGradient: s.surfaceGradient,
    primitives: { neutral: [...n], brand: [...accentScale(mode, brand.base)] },
  };
}

function shadowFor(style: SurfaceStyle, dark: boolean, ink: string) {
  if (style === "flat") return "none";
  if (style === "opaque") {
    return dark
      ? `0 1px 2px ${alpha(ink, 0.5)}, 0 8px 24px ${alpha(ink, 0.32)}`
      : `0 1px 2px ${alpha(ink, 0.08)}, 0 8px 24px ${alpha(ink, 0.08)}`;
  }
  return dark
    ? `0 28px 80px ${alpha(ink, 0.34)}`
    : `0 28px 70px ${alpha(ink, 0.12)}`;
}

/** Type, shape, and surface treatment: the same in light and dark. */
function themeTokens(theme: ThemeSource): Record<ThemeToken, string> {
  const { radius } = theme.shape;
  const glass = theme.surfaces === "glass";
  return {
    "font-sans": theme.type.sans,
    "font-display": theme.type.display,
    "font-mono": theme.type.mono,
    "radius-sm": radius.sm,
    "radius-md": radius.md,
    "radius-lg": radius.lg,
    "radius-xl": radius.xl,
    "radius-pill": radius.pill,
    "border-width": theme.shape.border,
    "focus-width": theme.shape.focusRing,
    "link-decoration": theme.links === "underline" ? "underline" : "none",
    "blur-surface": glass ? "24px" : "0px",
    "blur-overlay": glass ? "8px" : "0px",
  };
}

export function resolveTheme(theme: ThemeSource): ResolvedTheme {
  return {
    source: theme,
    tokens: themeTokens(theme),
    modes: { dark: resolveMode(theme, "dark"), light: resolveMode(theme, "light") },
  };
}
