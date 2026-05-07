import type { ReactNode } from "react";
import Link from "next/link";
import { AstraqLogo } from "@/app/components/AstraqLogo";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import styles from "./layout.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden="true">
            <AstraqLogo decorative className={styles.brandLogo} />
          </span>
          <span className={styles.brandText}>Astraq</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <p>
          Astraq is a personal trading research lab. Use it for learning and your own portfolio
          only — not for redistributing market data.
        </p>
      </footer>
    </div>
  );
}
