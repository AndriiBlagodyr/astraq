import type { Metadata, Route } from "next";
import Link from "next/link";
import { formatSymbol, getFeaturedSymbolParams } from "@/lib/stocks";
import styles from "../../../layout.module.css";

type StockPageProps = {
  params: Promise<{ symbol: string }>;
};

export function generateStaticParams() {
  return getFeaturedSymbolParams();
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { symbol } = await params;

  return {
    title: `${formatSymbol(symbol)} TradingView`,
  };
}

export default async function TradingViewStockPage({ params }: StockPageProps) {
  const { symbol } = await params;
  const symbolLabel = formatSymbol(symbol);

  const customRoute = `/stocks/${symbol}/custom` as Route;
  const compareRoute = `/stocks/${symbol}/compare` as Route;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Visualization route 1</p>
        <h2 className={styles.title}>{symbolLabel} TradingView page</h2>
        <p className={styles.lead}>
          This placeholder is reserved for the fastest path to a trustworthy charting experience. Use it to
          validate symbol lookups, intervals, overlays, and data quality before or while you build custom
          visuals.
        </p>
        <div className={styles.buttonRow}>
          <Link href={customRoute} className={styles.buttonPrimary}>
            Open custom charts
          </Link>
          <Link href={compareRoute} className={styles.buttonSecondary}>
            Compare with custom
          </Link>
        </div>
      </div>

      <div className={styles.split}>
        <article className={styles.card}>
          <h3>Planned blocks</h3>
          <ul className={styles.list}>
            <li>Embedded TradingView chart for the active stock.</li>
            <li>Interval and indicator controls for quick validation.</li>
            <li>Shared data labels that match the custom chart route.</li>
          </ul>
        </article>

        <article className={styles.card}>
          <h3>Learning value</h3>
          <p>
            TradingView gives you a stable baseline. That makes it easier to isolate what belongs to market data
            integration versus what belongs to your own visualization implementation.
          </p>
        </article>
      </div>
    </section>
  );
}
