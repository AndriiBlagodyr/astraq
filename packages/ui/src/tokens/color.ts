/**
 * sRGB <-> OKLCH conversion, hand-built (ADR 0002 §6).
 *
 * OKLCH separates lightness (L, 0-1), chroma (C, colorfulness) and hue (H,
 * degrees). Changing L alone keeps a color recognizably "the same red", which
 * sRGB math can't do. Matrices are from Björn Ottosson's OKLab reference.
 * Production alternative: culori or colorjs.io.
 */

/** Channels are 0-1 floats. */
export type Rgb = { r: number; g: number; b: number };
export type Oklch = { l: number; c: number; h: number };

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const fromLinear = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

export function hexToRgb(hex: string): Rgb {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) throw new Error(`Expected #rrggbb, got ${hex}`);
  const n = Number.parseInt(match[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const byte = (c: number) =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const h = (Math.atan2(bb, a) * 180) / Math.PI;
  return { l: L, c: Math.hypot(a, bb), h: (h + 360) % 360 };
}

/** Linear sRGB; may fall outside 0-1 when the color is out of gamut. */
function oklchToLinear({ l, c, h }: Oklch) {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960761 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (channels: number[]) =>
  channels.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/**
 * OKLCH to sRGB. Out-of-gamut colors keep their lightness and hue and lose
 * chroma until they fit, the least noticeable way to clip.
 */
export function oklchToRgb(color: Oklch): Rgb {
  let { c } = color;
  let channels = oklchToLinear(color);
  while (!inGamut(channels) && c > 0) {
    c = Math.max(0, c - 0.002);
    channels = oklchToLinear({ ...color, c });
  }
  const [r, g, b] = channels.map(fromLinear);
  return { r, g, b };
}

export const oklchToHex = (color: Oklch) => rgbToHex(oklchToRgb(color));
export const hexToOklch = (hex: string) => rgbToOklch(hexToRgb(hex));

/** `#rrggbb` at an opacity, as a CSS color. */
export function alpha(hex: string, opacity: number): string {
  if (opacity >= 1) return hex;
  const { r, g, b } = hexToRgb(hex);
  const byte = (c: number) => Math.round(c * 255);
  return `rgba(${byte(r)}, ${byte(g)}, ${byte(b)}, ${Number(opacity.toFixed(3))})`;
}
