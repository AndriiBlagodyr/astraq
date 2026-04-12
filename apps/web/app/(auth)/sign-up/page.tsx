import Link from "next/link";
import styles from "../auth.module.css";

export const metadata = {
  title: "Create Account",
};

export default function SignUpPage() {
  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Create account</h2>
      <p className={styles.panelText}>
        Start with a clean onboarding route for team invites, workspace creation, and future billing or broker
        verification.
      </p>

      <form className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="full-name">
            Full name
          </label>
          <input id="full-name" name="full-name" type="text" className={styles.input} placeholder="Alex Carter" />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-email">
            Work email
          </label>
          <input
            id="signup-email"
            name="signup-email"
            type="email"
            className={styles.input}
            placeholder="team@astraq.app"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            name="signup-password"
            type="password"
            className={styles.input}
            placeholder="Create a secure password"
          />
        </div>

        <button type="submit" className={styles.submit}>
          Create workspace
        </button>
      </form>

      <p className={styles.meta}>
        Already have access?{" "}
        <Link href="/sign-in" className={styles.inlineLink}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
