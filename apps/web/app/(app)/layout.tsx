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
            <p className={styles.brandSubtitle}>Trading intelligence workspace</p>
          </div>
        </Link>

        <AppNavigation />

        <div className={styles.sidebarCard}>
          <p className={styles.sidebarCardLabel}>Baseline ready</p>
          <p className={styles.sidebarCardText}>
            Theme tokens, provider wiring, route groups, metadata routes, and production layouts are in place.
          </p>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.headerEyebrow}>Production app shell</p>
            <h1 className={styles.headerTitle}>Astraq Workspace</h1>
          </div>

          <div className={styles.headerActions}>
            <ThemeToggle />
            <Link href="/sign-in" className={styles.headerLink}>
              Auth
            </Link>
            <Link href="/settings" className={styles.headerLinkPrimary}>
              Settings
            </Link>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
