import {
  Badge,
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
import {
  CHECK_STATUS,
  CHECK_TEXT,
  dataQualitySummary,
  type DataQualityReport,
} from "@/lib/data-quality";

/** How many of a check's findings a row lists; the count is of all of them. */
const SHOWN = 5;

/**
 * The stored bars' last data quality check on /status: one badge for the
 * whole, then a row per check with what it found.
 */
export function DataQualityPanel({
  report,
}: {
  report: DataQualityReport | null;
}) {
  const summary = dataQualitySummary(report);
  const checks = report?.run?.checks ?? [];

  return (
    <section aria-labelledby="data-quality-heading" className="grid gap-5">
      <Card className="grid gap-3 p-7">
        <h2
          id="data-quality-heading"
          className="m-0 font-display text-xl font-bold tracking-tight text-foreground"
        >
          Market data
        </h2>
        <p className="m-0 flex flex-wrap items-center gap-3 text-secondary">
          <Badge tone={summary.tone}>{summary.label}</Badge>
          <span>{summary.detail}</span>
        </p>
      </Card>

      {checks.length > 0 ? (
        <TableWrap>
          <Table>
            <TableCaption className="sr-only">
              Data quality checks of the stored daily bars
            </TableCaption>
            <Thead>
              <Tr>
                <Th>Check</Th>
                <Th>Status</Th>
                <Th align="end">Found</Th>
                <Th>Most recent</Th>
              </Tr>
            </Thead>
            <Tbody>
              {checks.map((check) => (
                <Tr key={check.check}>
                  <Td>
                    <span className="grid gap-0.5">
                      <span className="text-foreground">
                        {CHECK_TEXT[check.check].name}
                      </span>
                      <span className="text-xs text-muted">
                        {CHECK_TEXT[check.check].what}
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={CHECK_STATUS[check.status].tone}>
                      {CHECK_STATUS[check.status].text}
                    </Badge>
                  </Td>
                  <Td align="end" className="tabular-nums">
                    {check.status === "skipped" ? "—" : check.count}
                  </Td>
                  <Td>
                    {check.status === "skipped" ? (
                      <span className="text-muted">
                        The exchange calendar isn&apos;t loaded, so there is
                        nothing to check against.
                      </span>
                    ) : check.issues.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <ul className="m-0 grid list-none gap-1 p-0">
                        {check.issues.slice(0, SHOWN).map((issue) => (
                          <li key={`${issue.ticker} ${issue.session}`}>
                            <span className="font-semibold text-foreground">
                              {issue.ticker}
                            </span>
                            {issue.session ? ` · ${issue.session}` : null}
                            <span className="text-secondary">
                              {" "}
                              · {issue.detail}
                            </span>
                          </li>
                        ))}
                        {check.count > SHOWN ? (
                          <li className="text-muted">
                            and {check.count - SHOWN} more
                          </li>
                        ) : null}
                      </ul>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableWrap>
      ) : null}
    </section>
  );
}
