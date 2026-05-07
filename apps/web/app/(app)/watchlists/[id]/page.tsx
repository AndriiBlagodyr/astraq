import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../layout.module.css";

type WatchlistDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: WatchlistDetailProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Watchlist ${id}`,
  };
}

export default async function WatchlistDetailPage({ params }: WatchlistDetailProps) {
  const { id } = await params;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Watchlist · {id}</p>
        <h2 className={styles.title}>One watchlist, every angle.</h2>
        <p className={styles.lead}>
          A single watchlist surface that combines a sortable symbol table, sparklines, relative
          performance, and inline access to each symbol&apos;s workspace. Eventually, this is also
          where chart layouts and alert rules attach to a list.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/watchlists" className={styles.buttonSecondary}>
            All watchlists
          </Link>
          <Link href="/stocks" className={styles.buttonPrimary}>
            Add a symbol
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Symbol table</h3>
          <p>Sortable list with last price, day change, volume, and a click-through to the symbol workspace.</p>
        </article>
        <article className={styles.card}>
          <h3>Sparklines</h3>
          <p>Lightweight sparkline per row using <code>lightweight-charts</code> in mini mode.</p>
        </article>
        <article className={styles.card}>
          <h3>Relative performance</h3>
          <p>Compare every symbol in this list against a chosen benchmark over rolling windows.</p>
        </article>
        <article className={styles.card}>
          <h3>Saved layouts</h3>
          <p>Phase 6 ships saved chart layouts pinned per watchlist.</p>
        </article>
      </div>
    </section>
  );
}
