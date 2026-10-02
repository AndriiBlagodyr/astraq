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
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.text}>
          This page hit an unexpected error. Try again, or check whether a service is down.
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={() => reset()} className={styles.primary}>
            Try again
          </button>
          <Link href="/status" className={styles.secondary}>
            Status
          </Link>
        </div>
      </div>
    </main>
  );
}
