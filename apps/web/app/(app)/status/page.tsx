import Link from "next/link";
import {
  Badge,
  Card,
  Table,
  TableWrap,
  Td,
  Th,
  buttonVariants,
  type BadgeProps,
} from "@astraq/ui";
import styles from "../layout.module.css";

export const metadata = {
  title: "Roadmap status",
};

const phases = [
  {
    id: "0",
    label: "Monorepo and developer foundation",
    state: "Baseline complete",
  },
  { id: "1", label: "API foundation and contracts", state: "In progress" },
  { id: "1.5", label: "Design system foundation", state: "Next" },
  { id: "2", label: "Data model, MVP core, basic charts", state: "Planned" },
  { id: "3", label: "Production auth and account security", state: "Planned" },
  { id: "4", label: "Paper trading MVP and request tracing", state: "Planned" },
  { id: "5", label: "Market data infrastructure", state: "Planned" },
  {
    id: "6",
    label: "Advanced charting, market analysis, and document data",
    state: "Planned",
  },
  { id: "7", label: "Strategy engine and backtesting v1", state: "Planned" },
  { id: "8", label: "Python analytics and ML service", state: "Planned" },
  { id: "9", label: "Realtime, alerts, and services/ingest", state: "Planned" },
  { id: "10", label: "Observability, testing, performance", state: "Planned" },
  { id: "11", label: "Deployment and operations", state: "Planned" },
] as const;

function stateTone(
  state: (typeof phases)[number]["state"]
): BadgeProps["tone"] {
  if (state === "Baseline complete") return "positive";
  if (state === "In progress") return "warning";
  if (state === "Next") return "brand";
  return "neutral";
}

export default function StatusPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Roadmap status</p>
        <h2 className={styles.title}>Where Astraq is, and what ships next.</h2>
        <p className={styles.lead}>
          A live mirror of <code>ROADMAP.md</code>. Phase 1 is in progress, and
          the focused design system foundation comes before Phase 2 product
          expansion.
        </p>
        <div className={styles.buttonRow}>
          <Link
            href="/market-data"
            className={buttonVariants({ variant: "secondary" })}
          >
            Market data
          </Link>
          <Link href="/experiments" className={buttonVariants()}>
            Experiments
          </Link>
        </div>
      </div>

      <div className={styles.statGrid}>
        <Card className={styles.statCard}>
          <span className={styles.metricLabel}>Current phase</span>
          <span className={styles.metricValue}>Phase 1</span>
          <span className={styles.metricNote}>
            API foundation and contracts.
          </span>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.metricLabel}>Foundation</span>
          <span className={styles.metricValue}>Phase 0</span>
          <span className={styles.metricNote}>
            Baseline complete; deferred gaps are explicitly tracked.
          </span>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.metricLabel}>Next milestone</span>
          <span className={styles.metricValue}>OpenAPI + SDK</span>
          <span className={styles.metricNote}>
            First generated API flow consumed by <code>apps/web</code>.
          </span>
        </Card>
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Phase</Th>
              <Th>Goal</Th>
              <Th>State</Th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase) => (
              <tr key={phase.id}>
                <Td>
                  <code>Phase {phase.id}</code>
                </Td>
                <Td>{phase.label}</Td>
                <Td>
                  <Badge tone={stateTone(phase.state)}>{phase.state}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </section>
  );
}
