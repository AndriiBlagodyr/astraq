import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Portfolio",
};

export default function PortfolioPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Phase 4 · Paper trading</p>
        <h2 className={styles.title}>Holdings, cash, and PnL in one place.</h2>
        <p className={styles.lead}>
          The portfolio surface aggregates every paper trade you place into a single, accountable
          view. Track open positions, available cash, realized and unrealized PnL, and recent
          activity — all backed by the audit log.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/portfolio/orders" className={styles.buttonSecondary}>
            View orders
          </Link>
          <Link href="/portfolio/trades" className={styles.buttonSecondary}>
            View trade history
          </Link>
          <Link href="/strategies" className={styles.buttonPrimary}>
            Open strategies
          </Link>
        </div>
      </div>

      <div className={styles.statGrid}>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Equity</span>
          <span className={styles.metricValue}>$0.00</span>
          <span className={styles.metricNote}>Cash + market value of open positions.</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Cash</span>
          <span className={styles.metricValue}>$0.00</span>
          <span className={styles.metricNote}>Available buying power, post-orders.</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.metricLabel}>Day PnL</span>
          <span className={`${styles.metricValue} ${styles.positive}`}>+0.00%</span>
          <span className={styles.metricNote}>Realized + unrealized for today&apos;s session.</span>
        </article>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Open positions</h3>
          <p>Symbol, quantity, average cost, last price, and unrealized PnL with a row-level link to the symbol workspace.</p>
        </article>
        <article className={styles.card}>
          <h3>Risk rails</h3>
          <p>Phase 4 risk rules surface here: market-closed warnings, max order size, and insufficient-cash guards.</p>
        </article>
      </div>
    </section>
  );
}
