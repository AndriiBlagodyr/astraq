import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <p className={styles.eyebrow}>Phase 3 · Auth</p>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.lead}>
          Enter the email associated with your Astraq account and we&apos;ll send a single-use
          reset link. Tokens expire in 30 minutes and rotate on use to detect replay attempts.
        </p>
      </header>

      <div className={styles.placeholder}>
        <p className={styles.placeholderLabel}>Reset form placeholder</p>
        <p className={styles.placeholderText}>
          Email field with reCAPTCHA-style throttling and a success state explaining where to look
          for the reset email (inbox in production, Mailhog locally).
        </p>
      </div>

      <footer className={styles.cardFooter}>
        <Link href="/login" className={styles.linkSecondary}>
          Back to sign in
        </Link>
      </footer>
    </section>
  );
}
