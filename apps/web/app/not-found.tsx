import Link from "next/link";
import styles from "./status.module.css";

export default function NotFound() {
  return (
    <main className={styles.wrap}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>404</p>
        <h1 className={styles.title}>Route not found</h1>
        <p className={styles.text}>
          The page you requested is outside the current Astraq route map. Use the production shell routes to
          continue exploring the app setup.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            Back to home
          </Link>
          <Link href="/dashboard" className={styles.secondary}>
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
