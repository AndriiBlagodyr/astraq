import type { Metadata, Route } from "next";
import Link from "next/link";
import { formatSymbol, getFeaturedSymbolParams } from "@/lib/stocks";
import styles from "../../layout.module.css";

type StockPageProps = {
  params: Promise<{ symbol: string }>;
};

export function generateStaticParams() {
  return getFeaturedSymbolParams();
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { symbol } = await params;

  return {
    title: `${formatSymbol(symbol)} Workspace`,
  };
}

export default async function StockWorkspacePage({ params }: StockPageProps) {
  const { symbol } = await params;
  const symbolLabel = formatSymbol(symbol);

  const stockHome = `/stocks/${symbol}` as Route;
  const tradingViewRoute = `/stocks/${symbol}/tradingview` as Route;
  const customRoute = `/stocks/${symbol}/custom` as Route;
  const compareRoute = `/stocks/${symbol}/compare` as Route;
  const predictionRoute = `/predictions/${symbol}` as Route;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Stock workspace</p>
        <h2 className={styles.title}>{symbolLabel} is the shared context for charts, comparisons, and predictions.</h2>
        <p className={styles.lead}>
          This route is the stock-level hub. The idea is simple: use one normalized dataset for {symbolLabel},
          then explore it through TradingView, custom visuals, and prediction experiments without fragmenting the
          flow.
        </p>
        <div className={styles.buttonRow}>
          <Link href={tradingViewRoute} className={styles.buttonPrimary}>
            TradingView route
          </Link>
          <Link href={customRoute} className={styles.buttonSecondary}>
            Custom route
          </Link>
          <Link href={compareRoute} className={styles.buttonSecondary}>
            Compare both
          </Link>
          <Link href={predictionRoute} className={styles.buttonSecondary}>
            Prediction lab
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>TradingView page</h3>
          <p>Use a proven charting surface first for confidence in the incoming data and interaction patterns.</p>
        </article>
        <article className={styles.card}>
          <h3>Custom chart page</h3>
          <p>Rebuild the same dataset with D3 or chart libraries to deepen visualization and frontend skills.</p>
        </article>
        <article className={styles.card}>
          <h3>Comparison page</h3>
          <p>Keep one route dedicated to checking alignment between both visual systems for the same symbol.</p>
        </article>
        <article className={styles.card}>
          <h3>Prediction page</h3>
          <p>Link algorithms and backtests to the same stock so analysis and ML stay grounded in one workspace.</p>
        </article>
      </div>

      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Path</th>
              <th>Why it exists</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{stockHome}</td>
              <td>Symbol hub and shared navigation for {symbolLabel}.</td>
            </tr>
            <tr>
              <td>{tradingViewRoute}</td>
              <td>TradingView-based visualization placeholder.</td>
            </tr>
            <tr>
              <td>{customRoute}</td>
              <td>Custom charting and D3 placeholder.</td>
            </tr>
            <tr>
              <td>{compareRoute}</td>
              <td>Same-data comparison of both charting approaches.</td>
            </tr>
            <tr>
              <td>{predictionRoute}</td>
              <td>Per-stock ML workspace and evaluation paths.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
