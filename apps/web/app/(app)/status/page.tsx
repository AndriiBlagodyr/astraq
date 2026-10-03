import { connection } from "next/server";
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
import { checkServices } from "@/lib/health";

export const metadata = {
  title: "Status",
};

// Live health of the services behind the app. Data quality joins in Phase 4,
// SLOs in Phase 10 (docs/ui-plan.md § Status).
export default async function StatusPage() {
  // Checked on every request: a cached "up" would defeat the page.
  await connection();
  const services = await checkServices();
  const allUp = services.every((service) => service.status === "up");
  const checkedAt = new Date().toISOString();

  return (
    <main className="grid gap-5">
      <Card className="grid gap-3 p-7">
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          Status
        </h1>
        <p className="m-0 flex flex-wrap items-center gap-3 text-secondary">
          <Badge tone={allUp ? "positive" : "negative"}>
            {allUp ? "All services up" : "Service problem"}
          </Badge>
          <span>
            Checked at{" "}
            <time dateTime={checkedAt}>{checkedAt.slice(0, 19).replace("T", " ")} UTC</time>
          </span>
        </p>
      </Card>

      <TableWrap>
        <Table>
          <TableCaption className="sr-only">
            Health checks for the services behind Veracand
          </TableCaption>
          <Thead>
            <Tr>
              <Th>Service</Th>
              <Th>Status</Th>
              <Th>Response</Th>
              <Th align="end">Latency</Th>
            </Tr>
          </Thead>
          <Tbody>
            {services.map((service) => (
              <Tr key={service.name}>
                <Td>
                  <span className="grid gap-0.5">
                    <span className="text-foreground">{service.name}</span>
                    <code className="text-xs text-muted">{service.url}</code>
                  </span>
                </Td>
                <Td>
                  <Badge tone={service.status === "up" ? "positive" : "negative"}>
                    {service.status === "up" ? "Up" : "Down"}
                  </Badge>
                </Td>
                <Td>{service.detail}</Td>
                <Td align="end" className="tabular-nums">
                  {service.latencyMs === null ? "—" : `${service.latencyMs} ms`}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableWrap>
    </main>
  );
}
