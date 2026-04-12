import styles from "../layout.module.css";

export const metadata = {
  title: "Portfolio",
};

export default function PortfolioPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Portfolio</p>
        <h2 className={styles.title}>Exposure, allocation drift, and risk concentration</h2>
        <p className={styles.lead}>
          Use this route for holdings, account segmentation, realized performance, and rebalance workflows
          informed by the prediction layer.
        </p>
      </div>

      <div className={styles.statGrid}>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Net exposure</span>
          <strong className={styles.metricValue}>61%</strong>
          <span className={`${styles.metricNote} ${styles.positive}`}>Constructive risk posture</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Top sector concentration</span>
          <strong className={styles.metricValue}>24%</strong>
          <span className={styles.metricNote}>Semiconductors</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Hedge coverage</span>
          <strong className={styles.metricValue}>18%</strong>
          <span className={`${styles.metricNote} ${styles.warning}`}>Below target band</span>
        </article>
      </div>

      <article className={styles.card}>
        <h3>Portfolio route foundation</h3>
        <p>
          The route is ready for position tables, account drill-downs, PnL summaries, exposure heatmaps, and
          rebalance suggestions driven by signal confidence and risk policy.
        </p>
      </article>
    </section>
  );
}
