import Link from "next/link";
import { AstraqLogo } from "@/app/components/AstraqLogo";
import { defaultFeaturedSymbol } from "@/lib/stocks";
import styles from "./page.module.css";

export const metadata = {
  title: "Full-Stack Trading + ML Lab",
};

export default function MarketingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Build the app. Learn the stack. Test the ideas.</p>
          <h1 className={styles.title}>Astraq is a full-stack and ML learning lab for stock data, charts, and prediction experiments.</h1>
          <p className={styles.lead}>
            The project is now organized around the real goals: ingest market data, render the same stock data
            through TradingView and custom visuals, and explore multiple predictive algorithms per symbol.
          </p>

          <div className={styles.actions}>
            <Link href="/stocks" className={styles.actionPrimary}>
              Open Stock Routes
            </Link>
            <Link href={`/stocks/${defaultFeaturedSymbol}/compare`} className={styles.actionSecondary}>
              Compare Visualizations
            </Link>
          </div>

          <div className={styles.metricRow}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Market data</span>
              <strong className={styles.metricValue}>Ingest, normalize, reuse</strong>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Visualization modes</span>
              <strong className={styles.metricValue}>TradingView + custom charts</strong>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Prediction lab</span>
              <strong className={styles.metricValue}>Algorithms per stock</strong>
            </div>
          </div>
        </div>

        <div className={styles.logoPanel}>
          <div className={styles.logoGlow} />
          <AstraqLogo className={styles.logo} />
          <div className={styles.logoMeta}>
            <span>Animated front-page brand mark</span>
            <span>Router focused on data, charts, and ML placeholders</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Route structure</p>
          <h2 className={styles.sectionTitle}>Pages that match the learning workflow you actually want to build</h2>
        </div>

        <div className={styles.grid}>
          <article className={styles.card}>
            <span className={styles.pill}>/market-data</span>
            <h3>Data foundation</h3>
            <p>Define sources, intervals, storage, and symbol coverage before any visualization or ML work.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.pill}>/stocks</span>
            <h3>Stock workspaces</h3>
            <p>Choose a ticker and branch into TradingView, custom charts, comparison, and prediction routes.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.pill}>/stocks/[symbol]/tradingview</span>
            <h3>TradingView path</h3>
            <p>Use embeddable market charts first so you can validate data and UX before custom rendering.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.pill}>/stocks/[symbol]/custom</span>
            <h3>Custom visualization path</h3>
            <p>Build the same dataset again with D3 or chart libraries for deeper control and learning.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.pill}>/stocks/[symbol]/compare</span>
            <h3>Compare both approaches</h3>
            <p>Reserve a route for validating that TradingView and custom charts are driven by the same data.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.pill}>/predictions/[symbol]</span>
            <h3>Per-stock prediction lab</h3>
            <p>Test multiple algorithms, evaluation flows, and backtests for each ticker you research.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.pill}>/predictions/[symbol]/algorithms</span>
            <h3>Algorithm playground</h3>
            <p>Explore baseline models, feature ideas, and training setups without touching visualization routes.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.pill}>/experiments</span>
            <h3>Full-stack + ML experiments</h3>
            <p>Track side quests for jobs, APIs, data pipelines, notebooks, and infrastructure learnings.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
