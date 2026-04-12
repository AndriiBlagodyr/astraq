import Link from "next/link";
import { AstraqLogo } from "@/app/components/AstraqLogo";
import styles from "./page.module.css";

export const metadata = {
  title: "Trading Intelligence Platform",
};

export default function MarketingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Dark Theme. Market-first. Prediction-ready.</p>
          <h1 className={styles.title}>A production-ready Next.js foundation for trading and forecasting apps.</h1>
          <p className={styles.lead}>
            Astraq now has centralized theme variables, route groups for public, app, and auth surfaces, and a
            reusable layout system designed for dashboards, model insights, and portfolio workflows.
          </p>

          <div className={styles.actions}>
            <Link href="/dashboard" className={styles.actionPrimary}>
              Open Dashboard
            </Link>
            <Link href="/predictions" className={styles.actionSecondary}>
              Explore Predictions
            </Link>
          </div>

          <div className={styles.metricRow}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Theme tokens</span>
              <strong className={styles.metricValue}>Global CSS variables</strong>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Routing</span>
              <strong className={styles.metricValue}>Marketing, app, auth</strong>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Data layer</span>
              <strong className={styles.metricValue}>Mantine + React Query</strong>
            </div>
          </div>
        </div>

        <div className={styles.logoPanel}>
          <div className={styles.logoGlow} />
          <AstraqLogo className={styles.logo} />
          <div className={styles.logoMeta}>
            <span>Animated front-page brand mark</span>
            <span>Static browser icon at `/icon.svg`</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Platform surface</p>
          <h2 className={styles.sectionTitle}>Route-ready entry points for the product journey</h2>
        </div>

        <div className={styles.grid}>
          <article className={styles.card}>
            <span className={styles.pill}>/dashboard</span>
            <h3>Operator dashboard</h3>
            <p>Daily market summary, execution health, active models, and high-signal opportunities.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.pill}>/markets</span>
            <h3>Market monitoring</h3>
            <p>Watchlists, asset momentum, volatility regimes, and breakout setups in one surface.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.pill}>/predictions</span>
            <h3>Prediction workflows</h3>
            <p>Model confidence, scenario ranges, deployment cadence, and analyst review paths.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.pill}>/portfolio</span>
            <h3>Portfolio controls</h3>
            <p>Allocation drift, risk exposure, winners versus laggards, and rebalance decision support.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
