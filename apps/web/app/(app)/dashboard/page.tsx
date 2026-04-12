import styles from "../layout.module.css";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Overview</p>
        <h2 className={styles.title}>Daily market control center</h2>
        <p className={styles.lead}>
          Use this route as the core operator surface for macro conditions, model health, execution readiness,
          and the most actionable moves across the session.
        </p>
      </div>

      <div className={styles.statGrid}>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Signal quality</span>
          <strong className={styles.metricValue}>84.2%</strong>
          <span className={`${styles.metricNote} ${styles.positive}`}>+6.4% vs prior session</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Execution latency</span>
          <strong className={styles.metricValue}>182 ms</strong>
          <span className={`${styles.metricNote} ${styles.warning}`}>Monitor routing providers</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Portfolio drift</span>
          <strong className={styles.metricValue}>3.1%</strong>
          <span className={`${styles.metricNote} ${styles.positive}`}>Within rebalance range</span>
        </article>
      </div>

      <div className={styles.split}>
        <article className={styles.card}>
          <h3>What this setup includes</h3>
          <ul className={styles.list}>
            <li>Route groups for marketing, product, and auth flows.</li>
            <li>Centralized dark tokens for surfaces, borders, text, and trading accents.</li>
            <li>Mantine and React Query provider wiring for feature development.</li>
            <li>Shared product shell for dashboard, markets, predictions, portfolio, and settings.</li>
          </ul>
        </article>

        <article className={styles.card}>
          <h3>Immediate next steps</h3>
          <p>
            Connect real chart data, auth state, API clients, and prediction endpoints into these routes without
            revisiting the app foundation.
          </p>
        </article>
      </div>

      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Focus</th>
              <th>Status</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Theme system</td>
              <td>Ready</td>
              <td>
                <span className={styles.tag}>Foundation</span>
              </td>
            </tr>
            <tr>
              <td>Route shell</td>
              <td>Ready</td>
              <td>
                <span className={styles.tag}>Foundation</span>
              </td>
            </tr>
            <tr>
              <td>Data integrations</td>
              <td>Next</td>
              <td>
                <span className={styles.tag}>Build</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
