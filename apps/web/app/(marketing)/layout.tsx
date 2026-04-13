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
          <Link href="/experiments" className={styles.actionSecondary}>
            Experiments
          </Link>
          <Link href="/stocks" className={styles.actionPrimary}>
            Open Lab
          </Link>
        </div>
      </header>

      {children}

      <footer className={styles.footer}>
        <p className={styles.footerTitle}>Astraq learning architecture</p>
        <p className={styles.footerText}>
          The router is now centered on market data, two visualization paths, and ML prediction experiments for
          individual stocks.
        </p>
      </footer>
    </div>
  );
}
