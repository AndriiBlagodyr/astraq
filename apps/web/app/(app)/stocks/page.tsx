import type { Route } from "next";
import Link from "next/link";
import { featuredSymbols } from "@/lib/stocks";
import styles from "../layout.module.css";

export const metadata = {
  title: "Stocks",
};

export default function StocksPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Stock routes</p>
        <h2 className={styles.title}>Every stock gets one workspace and multiple ways to explore the same data.</h2>
        <p className={styles.lead}>
          This page is the entry point for symbol-specific routes. From here, each stock can branch into a
          TradingView page, a custom chart page, a comparison page, and its own prediction workspace.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/market-data" className={styles.buttonSecondary}>
            Review data layer
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        {featuredSymbols.map((symbol) => {
          const href = `/stocks/${symbol}` as Route;

          return (
            <article key={symbol} className={styles.card}>
              <span className={styles.tag}>{symbol}</span>
              <h3>{symbol} workspace</h3>
              <p>Placeholder entry point for routes, symbol context, timeframe choices, and shared data links.</p>
              <div className={styles.buttonRow}>
                <Link href={href} className={styles.buttonPrimary}>
                  Open {symbol}
                </Link>
              </div>
            </article>
          );
        })}

        <article className={styles.card}>
          <h3>Route pattern</h3>
          <ul className={styles.list}>
            <li>`/stocks/[symbol]` for the stock hub.</li>
            <li>`/stocks/[symbol]/tradingview` for embedded market charts.</li>
            <li>`/stocks/[symbol]/custom` for D3 and custom visual layers.</li>
            <li>`/stocks/[symbol]/compare` for same-data validation.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
