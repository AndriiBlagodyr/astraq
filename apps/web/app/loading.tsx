import styles from "./status.module.css";

export default function Loading() {
  return (
    <main className={styles.wrap}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Loading</p>
        <h1 className={styles.title}>Loading Forelume</h1>
        <div className={styles.actions}>
          <div className={styles.spinner} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
