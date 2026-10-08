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
import type { SymbolSummary } from "@/lib/market-data";
import { sessionChange } from "@/lib/stock-chart";
import { DayChange } from "./DayChange";

/**
 * Symbols with their last close and day change, each linking to its chart.
 * Used by Stocks (search results) and Today (every loaded symbol).
 */
export function SymbolTable({
  symbols,
  caption,
}: {
  symbols: SymbolSummary[];
  caption: string;
}) {
  return (
    <TableWrap>
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <Thead>
          <Tr>
            <Th>Ticker</Th>
            <Th>Name</Th>
            <Th>Exchange</Th>
            <Th className="text-right">Last close</Th>
            <Th>Day change</Th>
            <Th>As of</Th>
          </Tr>
        </Thead>
        <Tbody>
          {symbols.map((symbol) => {
            const session = symbol.latestClose
              ? sessionChange(symbol.latestClose)
              : null;
            return (
              <Tr key={symbol.ticker}>
                <Td>
                  <Link
                    href={`/stocks/${symbol.ticker}`}
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {symbol.ticker}
                  </Link>
                </Td>
                <Td>{symbol.name}</Td>
                <Td>
                  <code className="text-xs text-muted">{symbol.exchange}</code>
                </Td>
                {session ? (
                  <>
                    <Td className="text-right tabular-nums">{session.close}</Td>
                    <Td className="tabular-nums">
                      <DayChange session={session} />
                    </Td>
                    <Td className="text-sm text-muted">
                      <time dateTime={session.date}>{session.date}</time>
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
  );
}
