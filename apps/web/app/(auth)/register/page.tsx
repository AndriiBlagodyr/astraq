import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <p className={styles.eyebrow}>Phase 3 · Auth</p>
        <h1 className={styles.title}>Create an Astraq account</h1>
        <p className={styles.lead}>
          Sign up to claim watchlists, paper trades, and saved strategies. Phase 3 will hash
          passwords with Argon2id, send a verification email through Mailhog locally, and assign
          the default <code>user</code> role.
        </p>
      </header>

      <div className={styles.placeholder}>
        <p className={styles.placeholderLabel}>Registration form placeholder</p>
        <p className={styles.placeholderText}>
          Name, email, and password fields with strength validation and a confirm step will live
          here. Email verification is required before the account can place paper trades.
        </p>
      </div>

      <footer className={styles.cardFooter}>
        <Link href="/login" className={styles.linkPrimary}>
          Already have an account? Sign in
        </Link>
      </footer>
    </section>
  );
}
