import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export function Card({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn(
        // No backdrop blur: a card sits on the page's smooth gradient, where
        // a blur changes nothing you can see, and re-blurring every card on
        // every scrolled frame took the page from 60 to 15 frames a second
        // without a GPU. Surfaces that content moves under keep theirs.
        "rounded-xl border border-border bg-[image:var(--ds-gradient-surface)] p-6 shadow-soft",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: ComponentProps<"header">) {
  return (
    <header
      data-slot="card-header"
      className={cn("mb-5 grid gap-2", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn(
        "m-0 font-display text-xl font-bold tracking-tight text-balance text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("m-0 leading-7 text-pretty text-secondary", className)}
      {...props}
    />
  );
}
