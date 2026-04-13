"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavigation } from "@/lib/navigation";
import styles from "./AppNavigation.module.css";

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="App">
      <p className={styles.label}>Lab Routes</p>
      {appNavigation.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

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
    </nav>
  );
}
