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
    title: `${formatSymbol(symbol)} Algorithms`,
  };
}

export default async function PredictionAlgorithmsPage({ params }: PredictionPageProps) {
  const { symbol } = await params;
  const symbolLabel = formatSymbol(symbol);

  const predictionHome = `/predictions/${symbol}` as Route;
  const backtestsRoute = `/predictions/${symbol}/backtests` as Route;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Algorithm playground</p>
        <h2 className={styles.title}>Candidate models for {symbolLabel}</h2>
        <p className={styles.lead}>
          Use this route to compare algorithm families without overloading the rest of the prediction workflow.
          Start with simple baselines, then graduate to more complex models only when the pipeline is stable.
        </p>
        <div className={styles.buttonRow}>
          <Link href={predictionHome} className={styles.buttonSecondary}>
            Prediction overview
          </Link>
          <Link href={backtestsRoute} className={styles.buttonPrimary}>
            Backtests
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Baselines</h3>
          <p>Naive carry-forward, moving averages, simple regression, and rule-based heuristics go here first.</p>
        </article>
        <article className={styles.card}>
          <h3>Tree models</h3>
          <p>Random forests, XGBoost-style methods, and feature-importance experiments fit naturally on this route.</p>
        </article>
        <article className={styles.card}>
          <h3>Sequence ideas</h3>
          <p>Reserve space for temporal models once the simpler baselines and feature pipeline are trustworthy.</p>
        </article>
        <article className={styles.card}>
          <h3>Experiment log</h3>
          <p>Track what was tried, what target was used, and which metrics actually improved for {symbolLabel}.</p>
        </article>
      </div>
    </section>
  );
}
