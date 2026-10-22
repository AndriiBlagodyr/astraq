import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  /** One or two short sentences: why it's empty and what to do. */
  description?: ReactNode;
  /** A small icon or illustration. Decorative: it's hidden from assistive tech. */
  icon?: ReactNode;
  /** One clear next step, usually a single Button or link. */
  action?: ReactNode;
  /** The title's heading level, to fit the page outline. @default 3 */
  headingLevel?: 2 | 3 | 4;
};

/**
 * What a region shows when it has nothing yet: no watchlists, no backtests,
 * a filter that matched nothing. Short copy and one action. It fades in when
 * it mounts, never bounces. Safe in Server Components.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  headingLevel = 3,
  className,
  ...props
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div
      data-slot="empty-state"
      className={cn(
        "grid justify-items-center gap-2 px-6 py-10 text-center",
        // CSS-only entry (@starting-style): runs on mount, instant under reduced motion.
        "transition-opacity duration-(--ds-motion-slow) ease-out starting:opacity-0",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="mb-2 grid size-12 place-items-center rounded-full bg-brand/10 text-brand-fg [&_svg:not([class*='size-'])]:size-6"
        >
          {icon}
        </div>
      ) : null}
      <Heading className="m-0 font-display text-base font-semibold text-balance text-foreground">
        {title}
      </Heading>
      {description ? (
        <p className="m-0 max-w-sm text-sm leading-6 text-pretty text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
