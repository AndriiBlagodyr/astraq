"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavigationSections } from "@/lib/navigation";
import styles from "./AppNavigation.module.css";

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="App">
      {appNavigationSections.map((section) => (
        <div key={section.label} className={styles.section}>
          <p className={styles.label}>{section.label}</p>
          <div className={styles.links}>
            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? `${styles.link} ${styles.linkActive}` : styles.link}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
