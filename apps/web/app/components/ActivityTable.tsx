import Link from "next/link";
import {
  Table,
  TableCaption,
  TableWrap,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@astraq/ui";
import {
  formatMoney,
  formatPrice,
  formatShares,
  formatSignedMoney,
} from "@/lib/format";
import { cashSign } from "@/lib/money";
import type { ActivityItem } from "@/lib/portfolios";
import { LocalTime } from "./LocalTime";

const dash = <span className="text-muted">—</span>;

const signedShares = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 6,
  signDisplay: "exceptZero",
});

/** What a line was, and the detail under it. */
function describe(item: ActivityItem): {
  title: string;
  detail: string | null;
} {
  const commission =
    item.commission !== null && cashSign(item.commission) > 0
      ? `commission ${formatMoney(item.commission)}`
      : null;
  switch (item.kind) {
    case "deposit":
      return { title: "Deposit", detail: "Paper cash paid in" };
    case "withdrawal":
      return { title: "Withdrawal", detail: "Paper cash taken out" };
    case "buy":
      return { title: "Bought", detail: commission };
    case "sell":
      return {
        title: "Sold",
        detail: [
          item.realizedPnl !== null &&
            `realized ${formatSignedMoney(item.realizedPnl)}`,
          commission,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    case "split":
      return {
        title: item.split
          ? `Split ${formatShares(item.split.to)}-for-${formatShares(item.split.from)}`
          : "Split",
        detail: "Shares converted, cost unchanged",
      };
    case "dividend":
      return {
        title: "Dividend earned",
        detail:
          item.dividend === null
            ? null
            : `${formatMoney(item.dividend)} owed until its pay date`,
      };
    case "dividend_payment":
      return { title: "Dividend paid", detail: null };
  }
}

/**
 * A portfolio's ledger as a timeline, newest first (docs/ui-plan.md §
 * Portfolio, Activity tab): every fill, cash move, split, and dividend,
 * with what it did to cash and the cash after it. The top line's "cash
 * after" is the cash on the Holdings tab; that is the trace from a balance
 * back to its entries. Server-rendered; only the times are the browser's.
 */
export function ActivityTable({ activity }: { activity: ActivityItem[] }) {
  return (
    <TableWrap scroll>
      <Table>
        <TableCaption className="sr-only">
          Every ledger transaction with its effect on cash, newest first
        </TableCaption>
        <Thead>
          <Tr>
            <Th>When</Th>
            <Th>Event</Th>
            <Th align="end">Shares</Th>
            <Th align="end">Price</Th>
            <Th align="end">Cash</Th>
            <Th align="end">Cash after</Th>
          </Tr>
        </Thead>
        <Tbody>
          {activity.map((item) => {
            const { title, detail } = describe(item);
            return (
              <Tr key={item.seq}>
                <Td className="text-sm text-muted">
                  <LocalTime value={item.occurredAt} />
                </Td>
                <Td>
                  <span className="font-semibold text-foreground">
                    {title}
                    {item.ticker ? (
                      <>
                        {" "}
                        <Link
                          href={`/stocks/${item.ticker}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {item.ticker}
                        </Link>
                      </>
                    ) : null}
                  </span>
                  {detail ? (
                    <span className="block text-sm text-muted">{detail}</span>
                  ) : null}
                </Td>
                <Td align="end" className="tabular-nums">
                  {item.quantity === null
                    ? dash
                    : signedShares.format(Number(item.quantity))}
                </Td>
                <Td align="end" className="tabular-nums">
                  {item.price === null ? dash : formatPrice(item.price)}
                </Td>
                {/* Signed, not colored: paying for shares isn't a loss. */}
                <Td align="end" className="tabular-nums">
                  {cashSign(item.cashChange) === 0
                    ? dash
                    : formatSignedMoney(item.cashChange)}
                </Td>
                <Td align="end" className="tabular-nums">
                  {formatMoney(item.cashAfter)}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableWrap>
  );
}
