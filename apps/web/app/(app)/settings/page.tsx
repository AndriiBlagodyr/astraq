import styles from "../layout.module.css";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Settings</p>
        <h2 className={styles.title}>Workspace configuration, preferences, and integrations</h2>
        <p className={styles.lead}>
          This route is the home for broker connections, model flags, alert preferences, API keys, and user
          profile controls.
        </p>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Trading preferences</h3>
          <p>Theme mode, market timezone, chart defaults, and execution confirmations belong here.</p>
        </article>
        <article className={styles.card}>
          <h3>Integrations</h3>
          <p>Broker APIs, model providers, data vendors, notifications, and webhook destinations.</p>
        </article>
      </div>
    </section>
  );
}
