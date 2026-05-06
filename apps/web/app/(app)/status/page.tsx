import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Roadmap status",
};

const phases = [
  { id: "0", label: "Monorepo and developer foundation", state: "Done" },
  { id: "1", label: "API foundation and contracts", state: "In progress" },
  { id: "2", label: "Data model, MVP core, basic charts", state: "Next" },
  { id: "3", label: "Production auth and account security", state: "Planned" },
  { id: "4", label: "Paper trading MVP and request tracing", state: "Planned" },
  { id: "5", label: "Market data infrastructure", state: "Planned" },
  { id: "6", label: "Advanced charting, market analysis, and document data", state: "Planned" },
  { id: "7", label: "Strategy engine and backtesting v1", state: "Planned" },
  { id: "8", label: "Python analytics and ML service", state: "Planned" },
  { id: "9", label: "Realtime, alerts, and services/ingest", state: "Planned" },
  { id: "10", label: "Observability, testing, performance", state: "Planned" },
  { id: "11", label: "Deployment and operations", state: "Planned" },
] as const;

function stateClass(state: (typeof phases)[number]["state"]) {
  if (state === "Done") return styles.positive;
  if (state === "In progress") return styles.warning;
  if (state === "Next") return styles.tag;
  return undefined;
}

export default function StatusPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Roadmap status</p>
        <h2 className={styles.title}>Where Astraq is, and what ships next.</h2>
        <p className={styles.lead}>
          A live mirror of <code>ROADMAP.md</code>. Phase 0 is done, Phase 1 is in progress, and
          Phase 2 (data model, dev auth shim, basic candles) is next on deck.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/market-data" className={styles.buttonSecondary}>
            Market data
          </Link>
          <Link href="/experiments" className={styles.buttonPrimary}>
            Experiments
          </Link>
        </div>
      </div>

      <div className={styles.statGrid}>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Current phase</span>
          <span className={styles.metricValue}>Phase 1</span>
          <span className={styles.metricNote}>API foundation and contracts.</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Just shipped</span>
          <span className={styles.metricValue}>Phase 0</span>
          <span className={styles.metricNote}>Workspaces, env validation, marketing surface, theming.</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Next milestone</span>
          <span className={styles.metricValue}>NestJS + OpenAPI</span>
          <span className={styles.metricNote}>First handshake consumed by <code>apps/web</code>.</span>
        </article>
      </div>

      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Phase</th>
              <th>Goal</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase) => (
              <tr key={phase.id}>
                <td>
                  <code>Phase {phase.id}</code>
                </td>
                <td>{phase.label}</td>
                <td className={stateClass(phase.state)}>{phase.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
