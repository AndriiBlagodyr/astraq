import Link from "next/link";
import styles from "../layout.module.css";

export const metadata = {
  title: "Account",
};

export default function AccountPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Phase 3 · Auth and account security</p>
        <h2 className={styles.title}>Your account, your sessions, your keys.</h2>
        <p className={styles.lead}>
          Manage your profile, password, two-factor settings, active sessions, and personal API
          keys. This is also where the audit trail of security-sensitive actions surfaces — sign
          ins, password changes, token rotations.
        </p>
        <div className={styles.buttonRow}>
          <Link href="/login" className={styles.buttonSecondary}>
            Sign in
          </Link>
          <Link href="/portfolio" className={styles.buttonPrimary}>
            Open portfolio
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Profile</h3>
          <p>Display name, email (with verification status), and timezone for chart and report rendering.</p>
        </article>
        <article className={styles.card}>
          <h3>Security</h3>
          <p>Change password, manage TOTP 2FA, regenerate recovery codes, and revoke sessions.</p>
        </article>
        <article className={styles.card}>
          <h3>API keys</h3>
          <p>Personal keys for bots and scripts — scoped, rotated, and individually revocable.</p>
        </article>
        <article className={styles.card}>
          <h3>Activity log</h3>
          <p>The audit trail Phase 3 captures: sign ins, password changes, token reuse alerts, and key usage.</p>
        </article>
      </div>
    </section>
  );
}
