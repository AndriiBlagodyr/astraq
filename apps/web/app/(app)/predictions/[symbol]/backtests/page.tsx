import type { Metadata, Route } from "next";
import Link from "next/link";
import { formatSymbol, getFeaturedSymbolParams } from "@/lib/stocks";
import styles from "../../../layout.module.css";

type PredictionPageProps = {
  params: Promise<{ symbol: string }>;
};

export function generateStaticParams() {
  return getFeaturedSymbolParams();
}

export async function generateMetadata({ params }: PredictionPageProps): Promise<Metadata> {
  const { symbol } = await params;

  return {
    title: `${formatSymbol(symbol)} Backtests`,
  };
}

export default async function PredictionBacktestsPage({ params }: PredictionPageProps) {
  const { symbol } = await params;
  const symbolLabel = formatSymbol(symbol);

  const predictionHome = `/predictions/${symbol}` as Route;
  const algorithmsRoute = `/predictions/${symbol}/algorithms` as Route;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Evaluation route</p>
        <h2 className={styles.title}>{symbolLabel} backtests and validation</h2>
        <p className={styles.lead}>
          A model is only interesting if you can evaluate it honestly. This placeholder route is reserved for
          walk-forward testing, benchmark comparisons, and the metrics that decide whether an idea deserves more time.
        </p>
        <div className={styles.buttonRow}>
          <Link href={predictionHome} className={styles.buttonSecondary}>
            Prediction overview
          </Link>
          <Link href={algorithmsRoute} className={styles.buttonPrimary}>
            Algorithms
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Walk-forward validation</h3>
          <p>Placeholder for expanding windows, rolling retrains, and out-of-sample checkpoints.</p>
        </article>
        <article className={styles.card}>
          <h3>Metric panel</h3>
          <p>Track error, accuracy, drawdown impact, hit rate, and any domain-specific measure you care about.</p>
        </article>
        <article className={styles.card}>
          <h3>Regime analysis</h3>
          <p>Reserve this section for seeing where the model works: trending markets, range periods, or volatility spikes.</p>
        </article>
        <article className={styles.card}>
          <h3>Decision gate</h3>
          <p>Use one explicit page to decide whether a model graduates, gets revised, or gets dropped.</p>
        </article>
      </div>
    </section>
  );
}
