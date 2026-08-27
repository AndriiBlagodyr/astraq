import type { ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@astraq/ui";
import { AstraqLogo } from "@/app/components/AstraqLogo";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { marketingAuthActions, marketingNavigation } from "@/lib/navigation";
import styles from "./layout.module.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden="true">
            <AstraqLogo decorative className={styles.brandIconLogo} />
          </span>
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
          <div className={styles.authActions}>
            <Link
              href={marketingAuthActions[0].href}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              {marketingAuthActions[0].label}
            </Link>
            <Link
              href={marketingAuthActions[1].href}
              className={buttonVariants({ size: "sm" })}
            >
              {marketingAuthActions[1].label}
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className={styles.footer}>
        <p className={styles.footerTitle}>Astraq</p>
        <p className={styles.footerText}>
          Market data, charting, paper trading, strategies, and prediction
          research in one focused workspace.
        </p>
      </footer>
    </div>
  );
}
