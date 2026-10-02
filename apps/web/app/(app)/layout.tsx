import type { ReactNode } from "react";
import Link from "next/link";
import { AppNavigation } from "@/app/components/AppNavigation";
import { ForelumeLogo } from "@/app/components/ForelumeLogo";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import styles from "./layout.module.css";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <ForelumeLogo decorative className={styles.brandIcon} />
          <div>
            <p className={styles.brandTitle}>Forelume</p>
            <p className={styles.brandSubtitle}>Market research lab</p>
          </div>
        </Link>

        <AppNavigation />
      </aside>

      <div className={styles.content}>
        <header className={styles.header}>
          <ThemeToggle />
        </header>

        {children}
      </div>
    </div>
  );
}
