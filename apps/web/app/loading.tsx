import styles from "./status.module.css";

export default function Loading() {
  return (
    <main className={styles.wrap}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Loading</p>
        <h1 className={styles.title}>Preparing Astraq workspace</h1>
        <p className={styles.text}>
          Theme tokens, route layouts, and page content are loading into the current session.
        </p>
        <div className={styles.actions}>
          <div className={styles.spinner} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
