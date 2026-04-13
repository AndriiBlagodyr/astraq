import type { Metadata, Route } from "next";
import Link from "next/link";
import { formatSymbol, getFeaturedSymbolParams } from "@/lib/stocks";
import styles from "../../layout.module.css";

type PredictionPageProps = {
  params: Promise<{ symbol: string }>;
};

export function generateStaticParams() {
  return getFeaturedSymbolParams();
}

export async function generateMetadata({ params }: PredictionPageProps): Promise<Metadata> {
  const { symbol } = await params;

  return {
    title: `${formatSymbol(symbol)} Predictions`,
  };
}

export default async function PredictionWorkspacePage({ params }: PredictionPageProps) {
  const { symbol } = await params;
  const symbolLabel = formatSymbol(symbol);

  const algorithmsRoute = `/predictions/${symbol}/algorithms` as Route;
  const backtestsRoute = `/predictions/${symbol}/backtests` as Route;
  const compareRoute = `/stocks/${symbol}/compare` as Route;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Per-stock ML workspace</p>
        <h2 className={styles.title}>{symbolLabel} prediction overview</h2>
        <p className={styles.lead}>
          This route keeps prediction work grounded in one symbol. That makes it easier to connect features,
          targets, visualization context, and evaluation output without losing the thread of what you are testing.
        </p>
        <div className={styles.buttonRow}>
          <Link href={algorithmsRoute} className={styles.buttonPrimary}>
            Algorithms
          </Link>
          <Link href={backtestsRoute} className={styles.buttonSecondary}>
            Backtests
          </Link>
          <Link href={compareRoute} className={styles.buttonSecondary}>
            Chart comparison
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Targets</h3>
          <p>Placeholder for next-close regression, direction classification, volatility prediction, or regimes.</p>
        </article>
        <article className={styles.card}>
          <h3>Features</h3>
          <p>Reserve space for technical features, rolling stats, cross-asset context, and event-driven signals.</p>
        </article>
        <article className={styles.card}>
          <h3>Outputs</h3>
          <p>Prediction bands, confidence values, probability scores, and chart overlays can all attach here.</p>
        </article>
        <article className={styles.card}>
          <h3>Workflow</h3>
          <p>This page is the bridge between raw stock data, model experiments, and the visual routes for the symbol.</p>
        </article>
      </div>
    </section>
  );
}
