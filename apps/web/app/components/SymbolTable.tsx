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
import { QuoteCells } from "./QuoteCells";

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
          {symbols.map((symbol) => (
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
              <QuoteCells
                ticker={symbol.ticker}
                latestClose={symbol.latestClose}
                showDate
              />
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableWrap>
  );
}
