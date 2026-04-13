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
    title: `${formatSymbol(symbol)} Compare`,
  };
}

export default async function CompareStockPage({ params }: StockPageProps) {
  const { symbol } = await params;
  const symbolLabel = formatSymbol(symbol);

  const tradingViewRoute = `/stocks/${symbol}/tradingview` as Route;
  const customRoute = `/stocks/${symbol}/custom` as Route;
  const predictionRoute = `/predictions/${symbol}` as Route;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Comparison route</p>
        <h2 className={styles.title}>Compare TradingView and custom visualizations for {symbolLabel}</h2>
        <p className={styles.lead}>
          Keep a dedicated route for alignment checks. If the data, indicators, or time windows diverge here,
          you know the issue is in the transformation or rendering path rather than the broader app structure.
        </p>
        <div className={styles.buttonRow}>
          <Link href={tradingViewRoute} className={styles.buttonSecondary}>
            TradingView
          </Link>
          <Link href={customRoute} className={styles.buttonSecondary}>
            Custom charts
          </Link>
          <Link href={predictionRoute} className={styles.buttonPrimary}>
            Prediction lab
          </Link>
        </div>
      </div>

      <div className={styles.split}>
        <article className={styles.card}>
          <h3>TradingView column</h3>
          <p>Placeholder for the embedded reference chart, baseline indicators, and quick sanity checks.</p>
        </article>
        <article className={styles.card}>
          <h3>Custom chart column</h3>
          <p>Placeholder for your D3 or custom rendering, plus the features TradingView cannot express directly.</p>
        </article>
      </div>

      <article className={styles.card}>
        <h3>What should stay synchronized</h3>
        <ul className={styles.list}>
          <li>Identical OHLCV source and interval selection.</li>
          <li>Matching timezone and session boundaries.</li>
          <li>Shared overlay inputs before ML predictions are introduced.</li>
          <li>Clear diff notes when the custom route intentionally adds extra insight layers.</li>
        </ul>
      </article>
    </section>
  );
}
