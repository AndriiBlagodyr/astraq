import {
  ColorType,
  type ChartOptions,
  type DeepPartial,
} from "lightweight-charts";

// How a lightweight-charts canvas follows the design system. The chart can't
// read CSS variables itself, so these helpers turn the semantic tokens on
// <html> into concrete colors and timings. Browser-only: they read the DOM.

export type ChartPalette = {
  up: string;
  down: string;
  grid: string;
  axis: string;
  border: string;
  marker: string;
  font: string;
};

/** The current theme's chart colors, read once per paint. */
export function readChartPalette(): ChartPalette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    up: token("--ds-positive"),
    down: token("--ds-negative"),
    grid: token("--ds-chart-grid"),
    axis: token("--ds-chart-axis"),
    border: token("--ds-border-default"),
    marker: token("--ds-chart-1"),
    font: token("--ds-font-sans"),
  };
}

/** `#rrggbb` / `#rgb` / `rgb()` at the given opacity; other formats unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const rgb = color.match(/^rgba?\(([^,]+),([^,]+),([^,)]+)/);
  return rgb ? `rgba(${rgb[1]},${rgb[2]},${rgb[3]}, ${alpha})` : color;
}

/** Chart-wide options for a palette: transparent background, token colors. */
export function chartOptions(palette: ChartPalette): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor: palette.axis,
      fontFamily: palette.font || undefined,
      panes: { separatorColor: palette.border },
    },
    grid: {
      vertLines: { color: palette.grid },
      horzLines: { color: palette.grid },
    },
    rightPriceScale: { borderColor: palette.border },
    timeScale: { borderColor: palette.border },
  };
}

/**
 * How long a chart's first draw-in takes, in ms: the slowest motion token,
 * or 0 under reduced motion. The tokens already drop to 0ms there, but this
 * is a JS animation, so it checks for itself (docs/motion-and-delight-plan.md).
 */
export function drawInDuration(): number {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  const token = getComputedStyle(document.documentElement)
    .getPropertyValue("--ds-motion-slow")
    .trim();
  const value = parseFloat(token);
  if (!Number.isFinite(value)) return 0;
  return token.endsWith("ms") ? value : value * 1000;
}

// --ds-ease-out is cubic-bezier(0.22, 1, 0.36, 1), the classic ease-out
// quint; the closed form saves solving the bezier per frame.
export const easeOut = (t: number) => 1 - (1 - t) ** 5;
