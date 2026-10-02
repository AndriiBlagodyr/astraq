"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavigation } from "@/lib/navigation";
import styles from "./AppNavigation.module.css";

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="App">
      <div className={styles.links}>
        {appNavigation.map((item) => {
          // "/" would match every path as a prefix, so Today is exact-only.
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));

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
    </nav>
  );
}
