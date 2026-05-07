import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../layout.module.css";

type StrategyDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: StrategyDetailProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Strategy ${id}`,
  };
}

export default async function StrategyDetailPage({ params }: StrategyDetailProps) {
  const { id } = await params;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Strategy · {id}</p>
        <h2 className={styles.title}>One strategy, every result.</h2>
        <p className={styles.lead}>
          The strategy detail page shows the active definition, every saved version, and every
          backtest run so far — entry/exit rules, equity curves, summary metrics, and the link
          to the order log if the strategy has ever been executed live.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/strategies" className={styles.buttonSecondary}>
            All strategies
          </Link>
          <Link href="/backtests" className={styles.buttonPrimary}>
            New backtest
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Definition</h3>
          <p>Read-only view of the active strategy DSL with a diff toggle against the previous version.</p>
        </article>
        <article className={styles.card}>
          <h3>Backtest history</h3>
          <p>Each run with its date range, equity curve thumbnail, total return, Sharpe, and max drawdown.</p>
        </article>
        <article className={styles.card}>
          <h3>Live activity</h3>
          <p>Phase 9 surfaces strategy executions and triggered alerts here.</p>
        </article>
        <article className={styles.card}>
          <h3>Versions</h3>
          <p>Content-hashed timeline of saves, with the option to fork an older version into a new strategy.</p>
        </article>
      </div>
    </section>
  );
}
