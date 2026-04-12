import styles from "../layout.module.css";

export const metadata = {
  title: "Markets",
};

export default function MarketsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Markets</p>
        <h2 className={styles.title}>Monitor regimes, watchlists, and momentum pockets</h2>
        <p className={styles.lead}>
          This route is structured for multi-asset scans, breakout tracking, volatility views, and sector or
          basket-level monitoring.
        </p>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Watchlist blocks</h3>
          <p>Reserve this panel for equities, crypto, FX, and macro baskets with live ranking signals.</p>
        </article>
        <article className={styles.card}>
          <h3>Regime classification</h3>
          <p>Layer trend strength, volatility compression, and liquidity conditions into a unified state model.</p>
        </article>
      </div>

      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Market</th>
              <th>Bias</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>BTC / USD</td>
              <td className={styles.positive}>Bullish continuation</td>
              <td>0.78</td>
            </tr>
            <tr>
              <td>NASDAQ 100</td>
              <td className={styles.warning}>Range compression</td>
              <td>0.61</td>
            </tr>
            <tr>
              <td>EUR / USD</td>
              <td className={styles.negative}>Mean-reversion risk</td>
              <td>0.56</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
