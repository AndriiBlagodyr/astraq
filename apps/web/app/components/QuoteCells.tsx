import { Td } from "@astraq/ui";
import type { SparklinePoint } from "@astraq/shared";
import { formatPrice } from "@/lib/format";
import { sessionChange, type LatestClose } from "@/lib/stock-chart";
import { DayChange } from "./DayChange";
import { Sparkline } from "./Sparkline";

/**
 * A symbol's quote as table cells: last close, day change, then the
 * optional sparkline and session date. A symbol without candles gets one
 * cell across the same columns. The symbol tables on Today, Stocks, and
 * the watchlist pages all end their rows with these.
 */
export function QuoteCells({
  ticker,
  latestClose,
  sparkline,
  showDate = false,
}: {
  ticker: string;
  latestClose: LatestClose | null;
  /** Adds the "Last 30 sessions" cell. */
  sparkline?: SparklinePoint[];
  /** Adds the "As of" cell. */
  showDate?: boolean;
}) {
  if (!latestClose) {
    return (
      <Td
        colSpan={2 + (sparkline ? 1 : 0) + (showDate ? 1 : 0)}
        className="text-sm text-muted"
      >
        No candles yet
      </Td>
    );
  }
  const session = sessionChange(latestClose);
  return (
    <>
      <Td className="text-right tabular-nums">{formatPrice(session.close)}</Td>
      <Td className="tabular-nums">
        <DayChange session={session} />
      </Td>
      {sparkline ? (
        <Td>
          <Sparkline ticker={ticker} points={sparkline} />
        </Td>
      ) : null}
      {showDate ? (
        <Td className="text-sm text-muted">
          <time dateTime={session.date}>{session.date}</time>
        </Td>
      ) : null}
    </>
  );
}
