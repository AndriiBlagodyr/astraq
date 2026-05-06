import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <p className={styles.eyebrow}>Phase 3 · Auth</p>
        <h1 className={styles.title}>Welcome back to Astraq</h1>
        <p className={styles.lead}>
          Email + password sign-in. Once Phase 3 ships, this form will exchange your credentials
          for a JWT access token plus a rotating refresh cookie issued by{" "}
          <code>apps/api</code>.
        </p>
      </header>

      <div className={styles.placeholder}>
        <p className={styles.placeholderLabel}>Login form placeholder</p>
        <p className={styles.placeholderText}>
          Email and password fields wired with <code>react-hook-form</code> and Zod will live
          here. Until the API is ready, the Phase 2 dev auth shim accepts any seeded user.
        </p>
      </div>

      <footer className={styles.cardFooter}>
        <Link href="/forgot-password" className={styles.linkSecondary}>
          Forgot password?
        </Link>
        <Link href="/register" className={styles.linkPrimary}>
          Create account
        </Link>
      </footer>
    </section>
  );
}
