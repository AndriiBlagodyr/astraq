/**
 * WCAG 2.2 contrast math. Hand-built on purpose (ADR 0002 §6); the token
 * pipeline in PR 2 reuses it for the full theme matrix.
 */

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
