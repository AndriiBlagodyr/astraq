import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../layout.module.css";

type BacktestDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: BacktestDetailProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Backtest ${id}`,
  };
}

export default async function BacktestDetailPage({ params }: BacktestDetailProps) {
  const { id } = await params;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Backtest · {id}</p>
        <h2 className={styles.title}>Equity curve, trade log, summary metrics.</h2>
        <p className={styles.lead}>
          The detail surface is a single page that tells the full story of one run: the strategy
          version that produced it, the equity curve, every trade with its contribution, and the
          headline metrics — total return, Sharpe, max drawdown, win rate.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/backtests" className={styles.buttonSecondary}>
            All backtests
          </Link>
          <Link href="/strategies" className={styles.buttonPrimary}>
            Edit strategy
          </Link>
        </div>
      </div>

      <div className={styles.statGrid}>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Total return</span>
          <span className={`${styles.metricValue} ${styles.positive}`}>+0.0%</span>
          <span className={styles.metricNote}>Cumulative return over the backtest window.</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Sharpe</span>
          <span className={styles.metricValue}>0.00</span>
          <span className={styles.metricNote}>Annualized risk-adjusted return.</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Max drawdown</span>
          <span className={`${styles.metricValue} ${styles.negative}`}>-0.0%</span>
          <span className={styles.metricNote}>Largest peak-to-trough loss in the run.</span>
        </article>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Equity curve</h3>
          <p><code>lightweight-charts</code> line series with markers for entries and exits.</p>
        </article>
        <article className={styles.card}>
          <h3>Trade log</h3>
          <p>Every fill with timestamp, side, quantity, price, fees, and contribution to total return.</p>
        </article>
      </div>
    </section>
  );
}
