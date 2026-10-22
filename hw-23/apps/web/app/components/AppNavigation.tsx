"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavigation } from "@/lib/navigation";

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="App">
      <ul className="m-0 grid list-none gap-1 p-0">
        {appNavigation.map((item) => {
          // "/" would match every path as a prefix, so Today is exact-only.
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex min-h-10 items-center rounded-md border border-transparent px-3.5 text-[0.95rem] text-secondary",
                  "transition-[border-color,background-color,color,translate] duration-(--ds-motion-fast) ease-out",
                  "hover:text-foreground motion-safe:hover:translate-x-px",
                  "aria-[current=page]:border-border-strong aria-[current=page]:bg-surface-muted aria-[current=page]:text-foreground",
                  "aria-[current=page]:bg-[image:linear-gradient(90deg,color-mix(in_srgb,var(--ds-brand)_9%,transparent),color-mix(in_srgb,var(--ds-brand-strong)_9%,transparent))]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
