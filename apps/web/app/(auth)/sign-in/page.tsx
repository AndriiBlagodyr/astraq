import Link from "next/link";
import styles from "../auth.module.css";

export const metadata = {
  title: "Sign In",
};

export default function SignInPage() {
  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Sign in</h2>
      <p className={styles.panelText}>
        Connect your workspace access, continue to dashboards, and keep auth flows isolated inside their own
        route group.
      </p>

      <form className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" className={styles.input} placeholder="trader@astraq.app" />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input id="password" name="password" type="password" className={styles.input} placeholder="••••••••" />
        </div>

        <button type="submit" className={styles.submit}>
          Continue
        </button>
      </form>

      <p className={styles.meta}>
        New here?{" "}
        <Link href="/sign-up" className={styles.inlineLink}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
