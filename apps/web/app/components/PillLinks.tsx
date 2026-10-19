import type { Route } from "next";
import Link from "next/link";

export type PillLink = {
  key: string;
  text: string;
  href: Route;
  current: boolean;
};

/**
 * A row of links that reads as a segmented control; the current one is
 * marked. For views that live in the URL (the chart's range and price mode),
 * so each option is a plain link the server renders.
 */
export function PillLinks({
  label,
  items,
}: {
  label: string;
  items: PillLink[];
}) {
  return (
    <nav aria-label={label}>
      <ul className="m-0 flex list-none flex-wrap gap-1 rounded-pill border border-border p-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              scroll={false}
              className="inline-flex min-h-8 items-center rounded-pill px-3 text-sm font-semibold text-muted hover:text-foreground aria-[current=page]:bg-surface-muted aria-[current=page]:text-foreground"
            >
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
