import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Watchlists",
};

export default function WatchlistsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Phase 2 · MVP core</p>
        <h2 className={styles.title}>Group the symbols you actually trade.</h2>
        <p className={styles.lead}>
          Watchlists are the entry point for charts, comparisons, and strategy targets. This route
          will list your saved watchlists, show quick performance stats, and let you create,
          rename, reorder, or delete them.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/stocks" className={styles.buttonSecondary}>
            Browse stocks
          </Link>
          <Link href="/portfolio" className={styles.buttonPrimary}>
            Open portfolio
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>What lives here</h3>
          <ul className={styles.list}>
            <li>List of saved watchlists with quick day/week/month performance.</li>
            <li>Create, rename, reorder, and delete actions.</li>
            <li>Drill into a watchlist to manage its symbols and chart layouts.</li>
          </ul>
        </article>
        <article className={styles.card}>
          <h3>Backed by</h3>
          <ul className={styles.list}>
            <li>
              <code>Watchlist</code> and <code>WatchlistItem</code> entities from Phase 2.
            </li>
            <li>Symbol metadata reused from <code>/market-data</code>.</li>
            <li>Read-through cache in Redis for hot watchlist payloads.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
