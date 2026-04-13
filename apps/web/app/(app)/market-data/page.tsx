import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Market Data",
};

export default function MarketDataPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Data first</p>
        <h2 className={styles.title}>Market data should be the single source for every chart and prediction route.</h2>
        <p className={styles.lead}>
          Before building visualizations or ML workflows, this page anchors the plan for providers, normalized
          candles, symbol metadata, intervals, and whatever storage layer you choose next.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/stocks" className={styles.buttonPrimary}>
            Open stocks
          </Link>
          <Link href="/experiments" className={styles.buttonSecondary}>
            View experiments
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Provider adapters</h3>
          <p>Placeholder for Alpha Vantage, Polygon, Twelve Data, Yahoo, or your own ingestion adapters.</p>
        </article>
        <article className={styles.card}>
          <h3>Normalization rules</h3>
          <p>Define how OHLCV, timestamps, market sessions, splits, and currency details become one app format.</p>
        </article>
        <article className={styles.card}>
          <h3>Storage decisions</h3>
          <p>Reserve space for database choices, caching, retention windows, and replayable historical queries.</p>
        </article>
        <article className={styles.card}>
          <h3>Reuse contract</h3>
          <p>The same prepared dataset should power TradingView pages, custom charts, comparison pages, and ML.</p>
        </article>
      </div>

      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>/market-data</td>
              <td>Data contracts, providers, storage, and preparation strategy.</td>
            </tr>
            <tr>
              <td>/stocks/[symbol]</td>
              <td>One workspace per stock that reuses the prepared dataset.</td>
            </tr>
            <tr>
              <td>/stocks/[symbol]/compare</td>
              <td>Validate that both visualization approaches are looking at the same source data.</td>
            </tr>
            <tr>
              <td>/predictions/[symbol]</td>
              <td>Attach per-symbol ML experiments to the same market data pipeline.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
