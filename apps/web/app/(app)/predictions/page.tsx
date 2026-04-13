import type { Route } from "next";
import Link from "next/link";
import { featuredSymbols } from "@/lib/stocks";
import styles from "../layout.module.css";

export const metadata = {
  title: "Predictions",
};

export default function PredictionsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Prediction lab</p>
        <h2 className={styles.title}>Run prediction experiments per stock instead of mixing every idea into one page.</h2>
        <p className={styles.lead}>
          This hub separates the machine learning side of the project from the visualization side while still
          keeping everything tied back to a concrete symbol and its data pipeline.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/experiments" className={styles.buttonSecondary}>
            Experiment backlog
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        {featuredSymbols.map((symbol) => {
          const href = `/predictions/${symbol}` as Route;

          return (
            <article key={symbol} className={styles.card}>
              <span className={styles.tag}>{symbol}</span>
              <h3>{symbol} prediction workspace</h3>
              <p>Placeholder route for targets, features, algorithms, and evaluation linked to one stock.</p>
              <div className={styles.buttonRow}>
                <Link href={href} className={styles.buttonPrimary}>
                  Open {symbol}
                </Link>
              </div>
            </article>
          );
        })}

        <article className={styles.card}>
          <h3>Prediction route pattern</h3>
          <ul className={styles.list}>
            <li>`/predictions/[symbol]` for the stock-specific ML workspace.</li>
            <li>`/predictions/[symbol]/algorithms` for model choices and baselines.</li>
            <li>`/predictions/[symbol]/backtests` for evaluation, walk-forward tests, and metrics.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
