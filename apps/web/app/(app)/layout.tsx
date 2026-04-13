import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppNavigation } from "@/app/components/AppNavigation";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import styles from "./layout.module.css";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <Image src="/icon.svg" alt="" aria-hidden="true" width={38} height={38} className={styles.brandIcon} />
          <div>
            <p className={styles.brandTitle}>Astraq</p>
            <p className={styles.brandSubtitle}>Full-stack + ML learning workspace</p>
          </div>
        </Link>

        <AppNavigation />

        <div className={styles.sidebarCard}>
          <p className={styles.sidebarCardLabel}>Current focus</p>
          <p className={styles.sidebarCardText}>
            Build one clean data flow, visualize it in two ways, and attach prediction experiments to the same
            stock-specific routes.
          </p>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.headerEyebrow}>Learning workspace</p>
            <h1 className={styles.headerTitle}>Astraq Research Lab</h1>
          </div>

          <div className={styles.headerActions}>
            <ThemeToggle />
            <Link href="/" className={styles.headerLink}>
              Home
            </Link>
            <Link href="/experiments" className={styles.headerLinkPrimary}>
              Experiments
            </Link>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
