import Link from "next/link";
import { Badge } from "@astraq/ui";
import { sessionChange } from "@/lib/stock-chart";
import type { WatchlistSummary } from "@/lib/watchlists";

type Movers = WatchlistSummary["movers"];
type Mover = NonNullable<Movers["best"]>;

const percent = new Intl.NumberFormat("en-US", {
  signDisplay: "always",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function MoverChip({ mover }: { mover: Mover }) {
  const { changePercent } = sessionChange(mover.latestClose);
  if (changePercent === null) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Link
        href={`/stocks/${mover.ticker}`}
        className="font-semibold text-foreground underline-offset-4 hover:underline"
      >
        {mover.ticker}
      </Link>
      <Badge tone={changePercent >= 0 ? "positive" : "negative"}>
        {percent.format(changePercent)}%
      </Badge>
    </span>
  );
}

/**
 * A list's best and worst movers of its latest session, for the watchlist
 * index (docs/ui-plan.md § Watchlists). The api picks them; this shows the
 * ticker and its day change, best first. A list with one moving symbol
 * shows that one; a list with none (empty, or no candles yet) shows a dash.
 */
export function WatchlistMovers({ movers }: { movers: Movers }) {
  if (!movers.best) {
    return (
      <span className="text-muted">
        <span aria-hidden="true">—</span>
        <span className="sr-only">No day change yet</span>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
      <MoverChip mover={movers.best} />
      {movers.worst ? <MoverChip mover={movers.worst} /> : null}
    </span>
  );
}
