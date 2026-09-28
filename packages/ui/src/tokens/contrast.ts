/**
 * WCAG 2.2 contrast math and a lightness solver, hand-built (ADR 0002 §6).
 * The token build uses it to derive text, focus, and chart colors that pass
 * by construction; contrast.test.ts re-checks every pair.
 */

import { hexToOklch, oklchToHex } from "./color";

export type Rgba = { r: number; g: number; b: number; a: number };

export function parseColor(value: string): Rgba {
  const color = value.trim();
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
  );
  if (rgba) {
    const [, r, g, b, a] = rgba;
    return { r: +r, g: +g, b: +b, a: a === undefined ? 1 : +a };
  }
  throw new Error(`Unsupported color: ${value}`);
}

/** Source-over compositing in sRGB, which is what browsers do for alpha. */
export function composite(top: Rgba, bottom: Rgba, alpha = top.a): Rgba {
  const mix = (t: number, b: number) => t * alpha + b * (1 - alpha);
  return {
    r: mix(top.r, bottom.r),
    g: mix(top.g, bottom.g),
    b: mix(top.b, bottom.b),
    a: 1,
  };
}

function channel(value: number) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: Rgba) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgba, b: Rgba) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
}

export type ContrastCheck = {
  /** Opaque backgrounds the color sits on. */
  backgrounds: Rgba[];
  /** Also check over these tints of `tintColor` on each background. */
  tintColor?: string;
  tints?: number[];
  min: number;
};

/** Lowest contrast of `color` across every background (and tint) in `check`. */
export function worstContrast(color: string, check: ContrastCheck): number {
  const text = parseColor(color);
  const tints = check.tintColor ? [0, ...(check.tints ?? [])] : [0];
  const fill = check.tintColor ? parseColor(check.tintColor) : undefined;

  return Math.min(
    ...check.backgrounds.flatMap((background) =>
      tints.map((tint) =>
        contrastRatio(
          text,
          fill && tint > 0 ? composite(fill, background, tint) : background,
        ),
      ),
    ),
  );
}

/**
 * Returns `hex` unchanged if it passes; otherwise moves only its OKLCH
 * lightness (darker on light themes, lighter on dark) until it does. Hue and
 * chroma stay, so the result is still recognizably the same color.
 */
export function ensureContrast(
  hex: string,
  direction: "darker" | "lighter",
  check: ContrastCheck,
): string {
  const start = hexToOklch(hex);
  const step = direction === "darker" ? -0.005 : 0.005;

  for (let l = start.l; l >= 0 && l <= 1; l += step) {
    const candidate = l === start.l ? hex : oklchToHex({ ...start, l });
    if (worstContrast(candidate, check) >= check.min) return candidate;
  }
  throw new Error(
    `No ${direction} variant of ${hex} reaches ${check.min}:1 on these backgrounds`,
  );
}
