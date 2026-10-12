"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Crossfades page content when the path changes; the app shell around it
 * stays put. Keyed by pathname only, so a range or price toggle on the stock
 * page (a search-param change) swaps in place without a fade.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition
      key={pathname}
      name="route-content"
      share="auto"
      enter="auto"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
