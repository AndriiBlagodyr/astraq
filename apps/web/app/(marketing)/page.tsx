import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Home",
};

const capabilities = [
  {
    title: "Watchlists & symbols",
    description:
      "Search, follow, and group the symbols you actually trade. Watchlists feed every other view in the app.",
  },
  {
    title: "Candles & indicators",
    description:
      "Lightweight charts with EMA, SMA, Bollinger bands, and crosshair sync — tuned for daily review, not noise.",
  },
  {
    title: "Paper trading & PnL",
    description:
      "Place orders, record fills, and watch realized and unrealized PnL update across your portfolio in real time.",
  },
  {
    title: "Rule-based strategies",
    description:
      "Author strategies in a typed DSL — SMA crossover, RSI threshold, breakouts — and version them like code.",
  },
  {
    title: "Backtests you trust",
    description:
      "Run strategies on historical data with commissions and slippage, then inspect equity curves, Sharpe, and drawdown.",
  },
  {
    title: "ML forecasts & signals",
    description:
      "Pull forecast bands and directional signals from the Python service into the same chart you're studying.",
  },
] as const;

const statusBand = [
  { label: "Stage", value: "Phase 1 of 11" },
  { label: "Live now", value: "Charts, market data, prediction views" },
  { label: "Up next", value: "Auth, watchlists, paper trading" },
  { label: "North star", value: "Watchlist → chart → strategy → backtest" },
] as const;

export default function MarketingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroIntro}>
          <span className={styles.statusPill}>
            <span className={styles.statusDot} aria-hidden="true" />
            <span className={styles.statusVersion}>v0.1</span>
            <span className={styles.statusDivider} aria-hidden="true">
              ·
            </span>
            <span className={styles.statusPhase}>Phase 1 — API foundation</span>
          </span>

          <p className={styles.eyebrow}>Personal trading research lab</p>

          <h1 className={styles.title}>
            From candles to backtests, in one focused workspace.
          </h1>

          <p className={styles.lead}>
            Astraq pairs clean charts with watchlists, paper trading, rule-based strategies, and ML
            forecasts. One calm, readable surface for researching ideas, testing them on real
            history, and tracking the markets you care about.
          </p>

          <div className={styles.actionRow}>
            <Link href="/stocks" className={styles.actionPrimary}>
              Open the workspace
            </Link>
            <Link href="/market-data" className={styles.actionSecondary}>
              Browse market data
            </Link>
          </div>
        </div>

        <div className={styles.heroBody}>
          <div className={styles.capabilityGrid} aria-label="Platform capabilities">
            {capabilities.map((item) => (
              <article key={item.title} className={styles.capabilityCard}>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </article>
            ))}
          </div>

          <aside className={styles.previewPanel} aria-label="Workspace preview">
            <header className={styles.previewHeader}>
              <div className={styles.previewIdentity}>
                <span className={styles.previewSymbol}>SPY</span>
                <span className={styles.previewMeta}>1D · EMA 20 / 50</span>
              </div>
              <div className={styles.previewTabs} aria-hidden="true">
                <span className={`${styles.previewTab} ${styles.previewTabActive}`}>Chart</span>
                <span className={styles.previewTab}>Backtest</span>
                <span className={styles.previewTab}>Forecast</span>
              </div>
            </header>

            <div className={styles.chartMock}>
              <div className={styles.chartGrid} aria-hidden="true" />
              <div className={styles.forecastBand} aria-hidden="true" />
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
              <span className={styles.signalDot} aria-hidden="true" />
            </div>

            <dl className={styles.previewMetrics}>
              <div>
                <dt className={styles.metricLabel}>Strategy</dt>
                <dd className={styles.metricValue}>EMA 20 / 50 cross</dd>
              </div>
              <div>
                <dt className={styles.metricLabel}>Backtest</dt>
                <dd className={styles.metricValue}>
                  +18.4% · <span className={styles.metricMuted}>2y window</span>
                </dd>
              </div>
              <div>
                <dt className={styles.metricLabel}>Forecast</dt>
                <dd className={styles.metricValue}>Bias bullish</dd>
              </div>
            </dl>
          </aside>
        </div>

        <div className={styles.statusBand} aria-label="Roadmap status">
          {statusBand.map((item) => (
            <div key={item.label}>
              <p className={styles.statusBandLabel}>{item.label}</p>
              <p className={styles.statusBandValue}>{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
