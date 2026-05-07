import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Strategies",
};

export default function StrategiesPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Phase 7 · Strategy engine</p>
        <h2 className={styles.title}>Author rule-based strategies you can actually backtest.</h2>
        <p className={styles.lead}>
          Define entry and exit rules in a typed DSL — SMA crossover, RSI threshold, breakout —
          then save, version, and run them against historical candles. This route lists every
          strategy you have authored, with last-run results and quick links to backtests.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/strategies/new" className={styles.buttonPrimary}>
            New strategy
          </Link>
          <Link href="/backtests" className={styles.buttonSecondary}>
            View backtests
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Strategy list</h3>
          <p>Name, target symbols, last edited, last backtest summary, and a link into the detail view.</p>
        </article>
        <article className={styles.card}>
          <h3>Templates</h3>
          <p>Pre-seeded templates for SMA crossover, RSI threshold, and breakout — copy and edit instead of starting blank.</p>
        </article>
      </div>
    </section>
  );
}
