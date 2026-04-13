import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Experiments",
};

export default function ExperimentsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Learning backlog</p>
        <h2 className={styles.title}>Use this page for the side quests that make the project truly full stack.</h2>
        <p className={styles.lead}>
          Not every learning task belongs on a stock page. This route is the catchment area for experiments in
          APIs, background jobs, feature engineering, notebooks, model serving, and deployment architecture.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/market-data" className={styles.buttonSecondary}>
            Data foundation
          </Link>
          <Link href="/predictions" className={styles.buttonPrimary}>
            Prediction routes
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>API and ingestion work</h3>
          <p>Placeholder for server actions, API routes, rate-limit handling, and scheduled data collection.</p>
        </article>
        <article className={styles.card}>
          <h3>Feature engineering</h3>
          <p>Track experiments for rolling windows, indicator pipelines, derived labels, and reusable feature sets.</p>
        </article>
        <article className={styles.card}>
          <h3>Model operations</h3>
          <p>Reserve space for training jobs, artifact storage, versioning, and lightweight deployment ideas.</p>
        </article>
        <article className={styles.card}>
          <h3>Frontend architecture</h3>
          <p>Use this route for chart component design, state patterns, performance learnings, and UX experiments.</p>
        </article>
      </div>

      <article className={styles.card}>
        <h3>Why keep this route</h3>
        <ul className={styles.list}>
          <li>It protects the stock and prediction routes from becoming a dumping ground for every idea.</li>
          <li>It makes the educational goals of the project explicit instead of hiding them behind fake product pages.</li>
          <li>It gives you one place to note infrastructure or architectural questions before implementation begins.</li>
        </ul>
      </article>
    </section>
  );
}
