import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export type SkeletonProps = ComponentProps<"div">;

/**
 * A placeholder shaped like the content that's loading: size it with
 * className (`h-4 w-32`, `size-10 rounded-full`). Skeletons are hidden from
 * assistive tech; mark the loading region with `aria-busy` and give it a
 * label, or render a Spinner with `label` once, not per skeleton.
 *
 * The shimmer is static under reduced motion. Safe in Server Components.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-border",
        // Soft highlight sweeping across; removed entirely under reduced motion.
        "after:absolute after:inset-0 after:-translate-x-full after:bg-linear-to-r after:from-transparent after:via-foreground/8 after:to-transparent after:content-['']",
        "after:animate-[ds-shimmer_1.8s_ease-in-out_infinite] motion-reduce:after:hidden",
        className,
      )}
      {...props}
    />
  );
}

export type SkeletonTextProps = ComponentProps<"div"> & {
  /** @default 3 */
  lines?: number;
};

/** A paragraph placeholder; the last line is shorter, like real text. */
export function SkeletonText({ lines = 3, className, ...props }: SkeletonTextProps) {
  return (
    <div
      data-slot="skeleton-text"
      aria-hidden="true"
      className={cn("grid gap-2.5", className)}
      {...props}
    >
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 && lines > 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}
