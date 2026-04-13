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
    title: `${formatSymbol(symbol)} Custom Charts`,
  };
}

export default async function CustomStockPage({ params }: StockPageProps) {
  const { symbol } = await params;
  const symbolLabel = formatSymbol(symbol);

  const tradingViewRoute = `/stocks/${symbol}/tradingview` as Route;
  const compareRoute = `/stocks/${symbol}/compare` as Route;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Visualization route 2</p>
        <h2 className={styles.title}>{symbolLabel} custom charts and D3 playground</h2>
        <p className={styles.lead}>
          This route is where you learn by rebuilding the same market data with your own visual language:
          candlesticks, signal layers, annotations, feature overlays, and any custom analytics you want to try.
        </p>
        <div className={styles.buttonRow}>
          <Link href={tradingViewRoute} className={styles.buttonSecondary}>
            TradingView baseline
          </Link>
          <Link href={compareRoute} className={styles.buttonPrimary}>
            Compare outputs
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Core chart rebuild</h3>
          <p>Placeholder for custom candles, volume, zooming, and interaction built with D3 or a chart library.</p>
        </article>
        <article className={styles.card}>
          <h3>Signal overlays</h3>
          <p>Add moving averages, predicted ranges, event markers, and annotations that may not fit TradingView.</p>
        </article>
        <article className={styles.card}>
          <h3>Storytelling visuals</h3>
          <p>Reserve this route for narrative visuals, feature explainability, and visual ML debugging panels.</p>
        </article>
        <article className={styles.card}>
          <h3>Frontend learning space</h3>
          <p>This is where the project stretches your UI state, rendering, interaction, and chart architecture skills.</p>
        </article>
      </div>
    </section>
  );
}
