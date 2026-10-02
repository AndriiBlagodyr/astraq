import Link from "next/link";
import styles from "./status.module.css";

export default function NotFound() {
  return (
    <main className={styles.wrap}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>404</p>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.text}>
          This page doesn&apos;t exist. Forelume adds pages as each one gets real data, so an old link may
          point to one that was removed.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            Back to Today
          </Link>
        </div>
      </div>
    </main>
  );
}
