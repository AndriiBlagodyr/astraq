/**
 * 12-step OKLCH color scales (ADR 0002 §2, tier 1 primitives).
 *
 * Step roles follow the Radix Colors convention:
 *   1-2 backgrounds · 3-5 interactive fills · 6-8 borders
 *   9-10 solid fills · 11 secondary text · 12 primary text
 *
 * Light and dark are separate curves, not inversions: dark UIs need smaller
 * lightness gaps between surfaces and less chroma to avoid glowing edges.
 */

import { hexToOklch, oklchToHex } from "./color";
import type { Mode } from "./schema";

export type Scale = readonly string[] & { length: 12 };

type Curve = { l: readonly number[]; c: readonly number[] };

/**
 * Neutral curves, fitted to the original Forelume palette (hue ~257°). A
 * theme's `chroma` multiplies `c`, so 1 = Forelume's blue tint, 0 = pure gray.
 */
const NEUTRAL: Record<Mode, Curve> = {
  dark: {
    l: [0.175, 0.204, 0.231, 0.26, 0.29, 0.34, 0.42, 0.52, 0.62, 0.71, 0.856, 0.966],
    c: [0.034, 0.042, 0.05, 0.052, 0.054, 0.058, 0.062, 0.064, 0.062, 0.059, 0.039, 0.016],
  },
  light: {
    l: [0.995, 0.975, 0.952, 0.93, 0.905, 0.87, 0.8, 0.72, 0.658, 0.58, 0.498, 0.243],
    c: [0.003, 0.008, 0.013, 0.016, 0.02, 0.026, 0.035, 0.045, 0.049, 0.053, 0.057, 0.052],
  },
};

/** Accent lightness curves; step 9 is replaced by the seed itself. */
const ACCENT_L: Record<Mode, readonly number[]> = {
  dark: [0.18, 0.21, 0.26, 0.3, 0.35, 0.41, 0.49, 0.58, 0, 0.8, 0.86, 0.95],
  light: [0.99, 0.97, 0.94, 0.9, 0.86, 0.8, 0.72, 0.64, 0, 0.55, 0.48, 0.28],
};
/** Chroma relative to the seed's, low at the extremes where colors glow or muddy. */
const ACCENT_C = [0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.72, 0.85, 1, 0.95, 0.8, 0.45];

export function neutralScale(
  mode: Mode,
  tint: { hue: number; chroma: number },
): Scale {
  const curve = NEUTRAL[mode];
  return curve.l.map((l, i) =>
    oklchToHex({ l, c: curve.c[i] * tint.chroma, h: tint.hue }),
  ) as unknown as Scale;
}

export function accentScale(mode: Mode, seed: string): Scale {
  const { c, h } = hexToOklch(seed);
  return ACCENT_L[mode].map((l, i) =>
    i === 8 ? seed : oklchToHex({ l, c: c * ACCENT_C[i], h }),
  ) as unknown as Scale;
}

/** 1-based access so theme code reads like the step roles above. */
export const step = (scale: Scale, n: number) => scale[n - 1];
