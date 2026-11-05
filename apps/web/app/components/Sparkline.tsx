import type { SparklinePoint } from "@astraq/shared";
import { sparklineGeometry } from "@/lib/sparkline";

const WIDTH = 96;
const HEIGHT = 28;

const trendClass = {
  up: "text-positive",
  down: "text-negative",
  flat: "text-muted",
} as const;

const trendWord = { up: "up", down: "down", flat: "flat" } as const;

/**
 * A watchlist row's last closes as one line, colored by where it ended
 * against where it began (docs/motion-and-delight-plan.md: static SVG).
 * Rendered on the server; the numbers sit in the row's other cells, so the
 * picture is a summary, not the only copy.
 */
export function Sparkline({
  ticker,
  points,
}: {
  ticker: string;
  points: SparklinePoint[];
}) {
  if (points.length < 2) return null;
  const { path, end, trend } = sparklineGeometry(
    points.map((point) => Number(point.close)),
    WIDTH,
    HEIGHT
  );
  const first = points[0]!;
  const last = points[points.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={`${ticker}: ${points.length} closes from ${first.date} to ${last.date}, ${trendWord[trend]}`}
      className={`block ${trendClass[trend]}`}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={end.x} cy={end.y} r={2} fill="currentColor" />
    </svg>
  );
}
