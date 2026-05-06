import Link from "next/link";
import styles from "../../layout.module.css";

export const metadata = {
  title: "Orders",
};

export default function OrdersPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Phase 4 · Paper trading</p>
        <h2 className={styles.title}>Every order, with the full audit trail.</h2>
        <p className={styles.lead}>
          A chronological list of orders you have placed — open, filled, partially filled, or
          cancelled — with the request id, idempotency key, and trace span linking each one back
          to the API call that created it.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/portfolio" className={styles.buttonSecondary}>
            Back to portfolio
          </Link>
          <Link href="/portfolio/trades" className={styles.buttonPrimary}>
            View trades
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Order table</h3>
          <p>Symbol, side, quantity, price, status, placed-at, and a link to the trace in dev tools.</p>
        </article>
        <article className={styles.card}>
          <h3>Filters</h3>
          <p>Filter by status, symbol, date range, and source (manual vs strategy execution from Phase 9).</p>
        </article>
      </div>
    </section>
  );
}
