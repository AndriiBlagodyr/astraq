"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./status.module.css";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.wrap}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Application error</p>
        <h1 className={styles.title}>Something interrupted the current view</h1>
        <p className={styles.text}>
          The route shell is in place, but this screen hit an unexpected error. You can retry the segment or
          return to the dashboard.
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={() => reset()} className={styles.primary}>
            Try again
          </button>
          <Link href="/dashboard" className={styles.secondary}>
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
