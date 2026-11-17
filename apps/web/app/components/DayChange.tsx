import { Badge } from "@astraq/ui";
import { signedPercentPoints, signedPriceChange } from "@/lib/format";
import type { LastSession } from "@/lib/stock-chart";

/**
 * "+1.23 (+0.45%)", green or red; nothing when there's no previous close.
 * `percentOnly` drops the price change: "+0.45%".
 */
export function DayChange({
  session,
  percentOnly = false,
}: {
  session: Pick<LastSession, "change" | "changePercent">;
  percentOnly?: boolean;
}) {
  if (session.change === null || session.changePercent === null) return null;
  const percent = `${signedPercentPoints.format(session.changePercent)}%`;
  return (
    <Badge tone={session.change >= 0 ? "positive" : "negative"}>
      {percentOnly
        ? percent
        : `${signedPriceChange.format(session.change)} (${percent})`}
    </Badge>
  );
}
