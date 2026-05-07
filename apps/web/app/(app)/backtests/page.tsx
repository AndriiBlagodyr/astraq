import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Backtests",
};

export default function BacktestsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Phase 7 · Backtesting v1</p>
        <h2 className={styles.title}>Run strategies on real history. Trust the result.</h2>
        <p className={styles.lead}>
          Backtests are deterministic for a fixed input — same strategy, same data range, same
          commissions and slippage, same equity curve. This route lists every run with its
          summary metrics and links each one to the strategy that produced it.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/strategies" className={styles.buttonSecondary}>
            Back to strategies
          </Link>
          <Link href="/predictions" className={styles.buttonPrimary}>
            ML forecasts
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Backtest table</h3>
          <p>Strategy, symbols, date range, total return, Sharpe, max drawdown, and run-at timestamp.</p>
        </article>
        <article className={styles.card}>
          <h3>Compare runs</h3>
          <p>Pick two backtests side-by-side to inspect equity curves and trade logs against each other.</p>
        </article>
      </div>
    </section>
  );
}
