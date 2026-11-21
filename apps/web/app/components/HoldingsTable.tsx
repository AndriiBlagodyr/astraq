"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  IconButton,
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
  formatCostPerShare,
  formatMoney,
  formatPrice,
  formatShares,
  plainPercent,
} from "@/lib/format";
import { cashRatio } from "@/lib/money";
import type { Portfolio, Position } from "@/lib/portfolios";
import { OrderTicket } from "./OrderTicket";
import { SignedMoney } from "./SignedMoney";

const sessionDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const lotDay = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const dash = <span className="text-muted">—</span>;

/** A share of the portfolio's equity, "12.5%"; a dash when it can't be said. */
function Weight({
  value,
  equity,
}: {
  value: string | null;
  equity: string | null;
}) {
  const ratio =
    value === null || equity === null ? null : cashRatio(value, equity);
  return ratio === null ? dash : plainPercent.format(ratio);
}

/** Cost per share, or a dash. */
function PerShare({ cost, quantity }: { cost: string; quantity: string }) {
  return formatCostPerShare(cost, quantity) ?? dash;
}

/** The open lots under a position's row, oldest first: the order a sell takes them in. */
function LotRows({ position, id }: { position: Position; id: string }) {
  return position.lots.map((lot, index) => (
    <Tr key={`${lot.openedOn}:${index}`} id={index === 0 ? id : undefined}>
      <Td className="pl-12 text-sm text-muted">
        Bought{" "}
        <time dateTime={lot.openedOn}>
          {lotDay.format(new Date(lot.openedOn))}
        </time>
        {index === 0 && position.lots.length > 1 ? " · sold first" : null}
      </Td>
      <Td align="end" className="text-sm tabular-nums">
        {formatShares(lot.quantity)}
      </Td>
      <Td align="end" className="text-sm tabular-nums">
        <PerShare cost={lot.cost} quantity={lot.quantity} />
      </Td>
      <Td colSpan={5} className="text-sm text-muted tabular-nums">
        Cost {formatMoney(lot.cost)}
      </Td>
    </Tr>
  ));
}

/**
 * A portfolio's positions (docs/ui-plan.md § Portfolio, Holdings tab): what
 * is held, what it cost, and what it is worth at each symbol's latest
 * close. Cash is the last row, so the weights add up to the whole
 * portfolio. A row opens to its FIFO lots, and its Trade button opens the
 * order ticket on that symbol. A client component for those two; the
 * figures are the server's.
 */
export function HoldingsTable({ portfolio }: { portfolio: Portfolio }) {
  const { positions, equity } = portfolio;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const ticketPortfolio = [{ id: portfolio.id, name: portfolio.name }];

  function toggle(ticker: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(ticker)) next.add(ticker);
      return next;
    });
  }

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
            <Th>
              <span className="sr-only">Trade</span>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {positions.map((position) => {
            const open = expanded.has(position.ticker);
            const lotsId = `lots-${position.ticker}`;
            return (
              <Fragment key={position.ticker}>
                <Tr>
                  <Td>
                    <div className="flex items-center gap-2">
                      <IconButton
                        label={`${open ? "Hide" : "Show"} the lots of ${position.ticker}`}
                        variant="ghost"
                        size="sm"
                        aria-expanded={open}
                        aria-controls={open ? lotsId : undefined}
                        onClick={() => toggle(position.ticker)}
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={open ? "rotate-90" : undefined}
                        />
                      </IconButton>
                      <div className="min-w-0">
                        <Link
                          href={`/stocks/${position.ticker}`}
                          className="font-semibold text-foreground underline-offset-4 hover:underline"
                        >
                          {position.ticker}
                        </Link>
                        <span className="block max-w-56 truncate text-sm text-muted">
                          {position.name}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td align="end" className="tabular-nums">
                    {formatShares(position.quantity)}
                  </Td>
                  <Td align="end" className="tabular-nums">
                    <PerShare
                      cost={position.cost}
                      quantity={position.quantity}
                    />
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
                  <Td align="end">
                    <OrderTicket
                      portfolios={ticketPortfolio}
                      ticker={position.ticker}
                      side="sell"
                      variant="secondary"
                      size="sm"
                    />
                  </Td>
                </Tr>
                {open ? <LotRows position={position} id={lotsId} /> : null}
              </Fragment>
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
            <Td />
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
            <Td colSpan={2} />
          </Tr>
        </Tfoot>
      </Table>
    </TableWrap>
  );
}
