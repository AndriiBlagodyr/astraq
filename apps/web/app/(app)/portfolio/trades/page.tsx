import Link from "next/link";
import styles from "../../layout.module.css";

export const metadata = {
  title: "Trade history",
};

export default function TradesPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Phase 4 · Paper trading</p>
        <h2 className={styles.title}>Trades are the source of truth for PnL.</h2>
        <p className={styles.lead}>
          A trade is a fill recorded against an order. This view shows the full, immutable trade
          ledger that backs portfolio PnL, with realized/unrealized breakdowns and per-trade
          contribution to current equity.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/portfolio" className={styles.buttonSecondary}>
            Back to portfolio
          </Link>
          <Link href="/portfolio/orders" className={styles.buttonPrimary}>
            View orders
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Trade ledger</h3>
          <p>Symbol, fill price, quantity, fees, realized PnL, and the order id that produced the fill.</p>
        </article>
        <article className={styles.card}>
          <h3>Reconciliation</h3>
          <p>Compare aggregated trades against current positions — a cheap invariant check for accounting bugs.</p>
        </article>
      </div>
    </section>
  );
}
