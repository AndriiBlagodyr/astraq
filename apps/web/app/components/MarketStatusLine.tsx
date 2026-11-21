import { Badge } from "@astraq/ui";
import { marketStatusText, type MarketStatus } from "@/lib/market-status";

/**
 * Whether the US market is trading and the session that opens next
 * (docs/ui-plan.md § Today, Phase 3), from the api's clock: the one an
 * order placed now meets. True as of the page's load; it doesn't tick.
 */
export function MarketStatusLine({ status }: { status: MarketStatus }) {
  const text = marketStatusText(status);
  return (
    <div className="grid gap-1">
      <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary">
        <Badge tone={status.open ? "positive" : "neutral"}>{text.label}</Badge>
        <span>
          {text.detail}
          {text.next ? ` ${text.next}` : null}
        </span>
      </p>
      {text.caveat ? (
        <p className="m-0 text-sm text-muted">{text.caveat}</p>
      ) : null}
    </div>
  );
}
