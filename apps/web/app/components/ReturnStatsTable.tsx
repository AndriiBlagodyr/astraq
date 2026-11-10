import type { ReactNode } from "react";
import { Table, TableCaption, TableWrap, Tbody, Td, Th, Tr } from "@astraq/ui";
import {
  plainPercent,
  signedPercent,
  type DailyReturn,
  type ReturnStats,
} from "@/lib/returns-view";

const decimal = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function Day({ point }: { point: DailyReturn }) {
  return (
    <>
      {signedPercent.format(Number(point.return))}{" "}
      <span className="text-muted">
        on <time dateTime={point.date}>{point.date}</time>
      </span>
    </>
  );
}

/**
 * The summary statistics beside the histogram, as a table: the figures the
 * api computed in SQL, so the numbers don't depend on the picture.
 */
export function ReturnStatsTable({ stats }: { stats: ReturnStats }) {
  const rows: [string, ReactNode][] = [
    ["Sessions", stats.count],
    ["Mean daily return", signedPercent.format(Number(stats.mean))],
    [
      "Standard deviation",
      stats.stdDev === null ? "—" : plainPercent.format(Number(stats.stdDev)),
    ],
    [
      "Skewness",
      stats.skew === null ? "—" : decimal.format(Number(stats.skew)),
    ],
    ["Best day", <Day key="best" point={stats.best} />],
    ["Worst day", <Day key="worst" point={stats.worst} />],
    ["Up days", plainPercent.format(Number(stats.upShare))],
  ];

  return (
    <TableWrap>
      <Table>
        <TableCaption className="sr-only">
          Summary statistics of the daily returns
        </TableCaption>
        <Tbody>
          {rows.map(([label, value]) => (
            <Tr key={label}>
              <Th scope="row" className="text-left font-medium text-secondary">
                {label}
              </Th>
              <Td className="text-right tabular-nums">{value}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableWrap>
  );
}
