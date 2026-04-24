import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Home",
};

const focusAreas = [
  {
    title: "Market data",
    description: "Review coverage, intervals, and market context from one starting point.",
  },
  {
    title: "Stocks",
    description: "Move into symbol pages for charts, comparisons, and daily tracking.",
  },
  {
    title: "Predictions",
    description: "Keep model views close to chart analysis instead of hidden in separate flows.",
  },
] as const;

export default function MarketingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroIntro}>
          <p className={styles.eyebrow}>Market analysis platform</p>

          <h1 className={styles.title}>Research markets through one calm, readable workspace.</h1>
          <p className={styles.lead}>
            Start with market data, move into stock workspaces, and review prediction views without a crowded landing page or duplicated navigation.
          </p>

          <div className={styles.actionRow}>
            <Link href="/stocks" className={styles.actionPrimary}>
              Explore Stocks
            </Link>
          </div>
        </div>

        <div className={styles.heroBody}>
          <div className={styles.focusGrid} aria-label="Platform focus areas">
            {focusAreas.map((item) => (
              <article key={item.title} className={styles.focusCard}>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </article>
            ))}
          </div>

          <aside className={styles.chartPanel} aria-label="Market preview">
            <div className={styles.chartChrome}>
              <span className={styles.chartTitle}>Market preview</span>
              <span className={styles.chartSymbol}>SPY · 1D</span>
            </div>

            <div className={styles.chartMock}>
              <div className={styles.chartGrid} aria-hidden="true" />
              <div className={styles.candles} aria-hidden="true">
                <span className={`${styles.candle} ${styles.candleTall} ${styles.positive}`} />
                <span className={`${styles.candle} ${styles.candleMid} ${styles.negative}`} />
                <span className={`${styles.candle} ${styles.candleShort} ${styles.positive}`} />
                <span className={`${styles.candle} ${styles.candleTall} ${styles.positive}`} />
                <span className={`${styles.candle} ${styles.candleMid} ${styles.negative}`} />
                <span className={`${styles.candle} ${styles.candleTall} ${styles.positive}`} />
                <span className={`${styles.candle} ${styles.candleShort} ${styles.positive}`} />
                <span className={`${styles.candle} ${styles.candleMid} ${styles.negative}`} />
                <span className={`${styles.candle} ${styles.candleTall} ${styles.positive}`} />
                <span className={`${styles.candle} ${styles.candleShort} ${styles.positive}`} />
                <span className={`${styles.candle} ${styles.candleMid} ${styles.negative}`} />
                <span className={`${styles.candle} ${styles.candleTall} ${styles.positive}`} />
              </div>
              <div className={styles.trendLine} aria-hidden="true" />
            </div>

            <div className={styles.chartMetrics}>
              <div>
                <p className={styles.metricLabel}>Signal</p>
                <p className={styles.metricValue}>Trend intact</p>
              </div>
              <div>
                <p className={styles.metricLabel}>Volume</p>
                <p className={styles.metricValue}>Above average</p>
              </div>
              <div>
                <p className={styles.metricLabel}>Bias</p>
                <p className={styles.metricValue}>Bullish</p>
              </div>
            </div>
          </aside>
        </div>

        <div className={styles.summaryBand}>
          <div>
            <p className={styles.summaryLabel}>Built for</p>
            <p className={styles.summaryValue}>Daily market review</p>
          </div>
          <div>
            <p className={styles.summaryLabel}>Primary flow</p>
            <p className={styles.summaryValue}>Data to symbols to analysis</p>
          </div>
          <div>
            <p className={styles.summaryLabel}>Next layer</p>
            <p className={styles.summaryValue}>Paper trading and strategies</p>
          </div>
        </div>
      </section>
    </main>
  );
}
