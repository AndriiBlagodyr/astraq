// Geometry for a row's sparkline: a polyline through the last sessions'
// closes, scaled into a small box. Pure, so the server renders the SVG and a
// test can check the numbers; only Sparkline.tsx draws it.

export type SparklineTrend = "up" | "down" | "flat";

export type SparklineGeometry = {
  /** An SVG path through every point, oldest at the left. */
  path: string;
  /** Where the latest close sits, for the end marker. */
  end: { x: number; y: number };
  /** Latest close against the first: what the line's color says. */
  trend: SparklineTrend;
};

/**
 * Lays `closes` (oldest first, at least two) out in a `width` x `height`
 * box, with `padding` so the stroke and end marker aren't clipped. A flat
 * series (all closes equal) draws through the middle instead of dividing by
 * zero.
 */
export function sparklineGeometry(
  closes: number[],
  width: number,
  height: number,
  padding = 2
): SparklineGeometry {
  if (closes.length < 2) {
    throw new RangeError("A sparkline needs at least two closes");
  }
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const x = (index: number) =>
    padding + (index / (closes.length - 1)) * innerWidth;
  const y = (close: number) =>
    max === min
      ? height / 2
      : padding + ((max - close) / (max - min)) * innerHeight;

  const points = closes.map((close, index) => [x(index), y(close)] as const);
  const path = points
    .map(
      ([px, py], index) => `${index === 0 ? "M" : "L"}${round(px)} ${round(py)}`
    )
    .join(" ");
  const last = points[points.length - 1]!;
  const first = closes[0]!;
  const latest = closes[closes.length - 1]!;

  return {
    path,
    end: { x: round(last[0]), y: round(last[1]) },
    trend: latest > first ? "up" : latest < first ? "down" : "flat",
  };
}

/** Two decimals: enough for a 100px box, and keeps the markup short. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
