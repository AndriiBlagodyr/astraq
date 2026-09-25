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
        "rounded-xl border border-border bg-[image:var(--ds-gradient-surface)] p-6 shadow-[var(--ds-shadow-soft)] backdrop-blur-xl",
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
