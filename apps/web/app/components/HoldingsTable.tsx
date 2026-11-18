import Link from "next/link";
import {
  Table,
  TableCaption,
  TableWrap,
  Tbody,
  Td,
  Tfoot,
  Th,
  Thead,
  Tr,
} from "@astraq/ui";
import {
  formatMoney,
  formatPrice,
  formatShares,
  plainPercent,
} from "@/lib/format";
import { cashRatio } from "@/lib/money";
import type { Portfolio } from "@/lib/portfolios";
import { SignedMoney } from "./SignedMoney";

const sessionDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const dash = <span className="text-muted">—</span>;

/** A share of the portfolio's equity, "12.5%"; a dash when it can't be said. */
function Weight({ value, equity }: { value: string | null; equity: string | null }) {
  const ratio =
    value === null || equity === null ? null : cashRatio(value, equity);
  return ratio === null ? dash : plainPercent.format(ratio);
}

/**
 * A portfolio's positions (docs/ui-plan.md § Portfolio, Holdings tab): what
 * is held, what it cost, and what it is worth at each symbol's latest
 * close. Cash is the last row, so the weights add up to the whole
 * portfolio. Server-rendered: nothing here changes without a new request.
 *
 * The average cost is the one figure computed here with a float: it is a
 * label for a per-share number the ledger doesn't keep, and nothing is
 * derived from it.
 */
export function HoldingsTable({ portfolio }: { portfolio: Portfolio }) {
  const { positions, equity } = portfolio;

  return (
    <TableWrap scroll>
      <Table>
        <TableCaption className="sr-only">
          Positions at their latest close, then cash
        </TableCaption>
        <Thead>
          <Tr>
            <Th>Symbol</Th>
            <Th align="end">Shares</Th>
            <Th align="end">Avg cost</Th>
            <Th align="end">Last close</Th>
            <Th align="end">Market value</Th>
            <Th align="end">Unrealized PnL</Th>
            <Th align="end">Weight</Th>
          </Tr>
        </Thead>
        <Tbody>
          {positions.map((position) => {
            const perShare = Number(position.cost) / Number(position.quantity);
            return (
              <Tr key={position.ticker}>
                <Td>
                  <Link
                    href={`/stocks/${position.ticker}`}
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {position.ticker}
                  </Link>
                  <span className="block max-w-56 truncate text-sm text-muted">
                    {position.name}
                  </span>
                </Td>
                <Td align="end" className="tabular-nums">
                  {formatShares(position.quantity)}
                </Td>
                <Td align="end" className="tabular-nums">
                  {Number.isFinite(perShare)
                    ? formatPrice(String(perShare))
                    : dash}
                </Td>
                <Td align="end" className="tabular-nums">
                  {position.lastPrice === null ? (
                    dash
                  ) : (
                    <>
                      {formatPrice(position.lastPrice)}
                      {position.priceDate ? (
                        <time
                          dateTime={position.priceDate}
                          className="block text-sm text-muted"
                        >
                          {sessionDay.format(new Date(position.priceDate))}
                        </time>
                      ) : null}
                    </>
                  )}
                </Td>
                <Td align="end" className="tabular-nums">
                  {position.marketValue === null
                    ? dash
                    : formatMoney(position.marketValue)}
                </Td>
                <Td align="end">
                  <SignedMoney value={position.unrealizedPnl} />
                </Td>
                <Td align="end" className="tabular-nums">
                  <Weight value={position.marketValue} equity={equity} />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
        <Tfoot>
          <Tr>
            <Th scope="row">Cash</Th>
            <Td colSpan={3} />
            <Td align="end" className="tabular-nums">
              {formatMoney(portfolio.cash)}
            </Td>
            <Td />
            <Td align="end" className="tabular-nums">
              <Weight value={portfolio.cash} equity={equity} />
            </Td>
          </Tr>
          <Tr>
            <Th scope="row">Total</Th>
            <Td colSpan={3} />
            <Td align="end" className="font-semibold tabular-nums">
              {equity === null ? dash : formatMoney(equity)}
            </Td>
            <Td align="end">
              <SignedMoney value={portfolio.unrealizedPnl} />
            </Td>
            <Td />
          </Tr>
        </Tfoot>
      </Table>
    </TableWrap>
  );
}
