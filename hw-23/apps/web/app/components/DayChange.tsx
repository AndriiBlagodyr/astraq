import { Badge } from "@astraq/ui";
import type { LastSession } from "@/lib/stock-chart";

const signed = new Intl.NumberFormat("en-US", {
  signDisplay: "always",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "+1.23 (+0.45%)", green or red; nothing when there's no previous close. */
export function DayChange({
  session,
}: {
  session: Pick<LastSession, "change" | "changePercent">;
}) {
  if (session.change === null || session.changePercent === null) return null;
  return (
    <Badge tone={session.change >= 0 ? "positive" : "negative"}>
      {signed.format(session.change)} ({signed.format(session.changePercent)}
      %)
    </Badge>
  );
}
