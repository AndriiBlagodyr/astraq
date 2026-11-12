import Link from "next/link";
import {
  Card,
  Table,
  TableCaption,
  TableWrap,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@astraq/ui";
import { formatPrice, sessionChange } from "@/lib/stock-chart";
import type { Watchlist } from "@/lib/watchlists";
import { DayChange } from "./DayChange";
import { Sparkline } from "./Sparkline";

/**
 * One watchlist on Today (docs/ui-plan.md § Today, Phase 2): its symbols in
 * the user's order with last close, day change, and the sparkline. Read
 * only; the heading opens the list's own page, where it's edited.
 */
export function WatchlistSummaryCard({ watchlist }: { watchlist: Watchlist }) {
  const count = watchlist.items.length;

  return (
    <Card className="grid gap-4 p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-xl font-semibold text-foreground">
          <Link
            href={`/watchlists/${watchlist.id}`}
            className="underline-offset-4 hover:underline"
          >
            {watchlist.name}
          </Link>
        </h2>
        <p className="m-0 text-sm text-muted">
          {count} {count === 1 ? "symbol" : "symbols"}
        </p>
      </div>

      {count === 0 ? (
        <p className="m-0 text-sm text-secondary">
          Nothing on this list yet.{" "}
          <Link
            href={`/watchlists/${watchlist.id}`}
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Add symbols
          </Link>
        </p>
      ) : (
        <TableWrap>
          <Table>
            <TableCaption className="sr-only">
              {watchlist.name}: last close and day change per symbol
            </TableCaption>
            <Thead>
              <Tr>
                <Th>Ticker</Th>
                <Th>Name</Th>
                <Th className="text-right">Last close</Th>
                <Th>Day change</Th>
                <Th>Last 30 sessions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {watchlist.items.map((item) => {
                const session = item.latestClose
                  ? sessionChange(item.latestClose)
                  : null;
                return (
                  <Tr key={item.ticker}>
                    <Td>
                      <Link
                        href={`/stocks/${item.ticker}`}
                        className="font-semibold text-foreground underline-offset-4 hover:underline"
                      >
                        {item.ticker}
                      </Link>
                    </Td>
                    <Td>{item.name}</Td>
                    {session ? (
                      <>
                        <Td className="text-right tabular-nums">
                          {formatPrice(session.close)}
                        </Td>
                        <Td className="tabular-nums">
                          <DayChange session={session} />
                        </Td>
                        <Td>
                          <Sparkline
                            ticker={item.ticker}
                            points={item.sparkline}
                          />
                        </Td>
                      </>
                    ) : (
                      <Td colSpan={3} className="text-sm text-muted">
                        No candles yet
                      </Td>
                    )}
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
}
