import Link from "next/link";
import styles from "../../layout.module.css";

export const metadata = {
  title: "New strategy",
};

export default function NewStrategyPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Phase 7 · Strategy engine</p>
        <h2 className={styles.title}>Compose a strategy you can read in plain English.</h2>
        <p className={styles.lead}>
          The author surface is split in two: a guided form for the common building blocks
          (indicators, comparisons, position sizing) and a JSON view of the underlying DSL,
          validated against the Zod schema in <code>packages/shared</code>.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/strategies" className={styles.buttonSecondary}>
            Cancel
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Guided form</h3>
          <p>Choose entry, exit, position size, and risk rules from a set of validated building blocks.</p>
        </article>
        <article className={styles.card}>
          <h3>DSL preview</h3>
          <p>Live JSON preview of the strategy definition, with inline schema errors before save.</p>
        </article>
        <article className={styles.card}>
          <h3>Quick-run backtest</h3>
          <p>One-click sanity backtest against the last year of data for the selected symbols.</p>
        </article>
        <article className={styles.card}>
          <h3>Save and version</h3>
          <p>Strategies are content-hashed; every save is a new version with a diff against the prior one.</p>
        </article>
      </div>
    </section>
  );
}
