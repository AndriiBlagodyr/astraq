import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { marketingNavigation } from "@/lib/navigation";
import styles from "./layout.module.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image src="/icon.svg" alt="" aria-hidden="true" width={32} height={32} className={styles.brandIcon} />
          <span className={styles.brandText}>Astraq</span>
        </Link>

        <nav className={styles.nav} aria-label="Marketing">
          {marketingNavigation.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          <Link href="/sign-in" className={styles.actionSecondary}>
            Sign in
          </Link>
          <Link href="/sign-up" className={styles.actionPrimary}>
            Start Free
          </Link>
        </div>
      </header>

      {children}

      <footer className={styles.footer}>
        <p className={styles.footerTitle}>Astraq production baseline</p>
        <p className={styles.footerText}>
          Centralized dark theme tokens, route groups, app shell structure, and metadata routes are ready for
          real product features.
        </p>
      </footer>
    </div>
  );
}
