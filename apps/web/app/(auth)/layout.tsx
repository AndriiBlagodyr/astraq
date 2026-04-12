import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import styles from "./auth.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <section className={styles.visual}>
        <div className={styles.utilityBar}>
          <Link href="/" className={styles.brand}>
            <Image src="/icon.svg" alt="" aria-hidden="true" width={34} height={34} className={styles.brandIcon} />
            <span>Astraq</span>
          </Link>
          <ThemeToggle />
        </div>

        <p className={styles.eyebrow}>Secure access</p>
        <h1 className={styles.title}>Authentication surfaces for analysts, operators, and prediction teams.</h1>
        <p className={styles.lead}>
          This route group is ready for your auth provider, session strategy, and onboarding steps without
          changing the overall app structure.
        </p>

        <ul className={styles.points}>
          <li>Email and password entry points</li>
          <li>Future SSO and broker-linked access</li>
          <li>Invite flows and workspace onboarding</li>
        </ul>
      </section>

      <section className={styles.content}>{children}</section>
    </div>
  );
}
