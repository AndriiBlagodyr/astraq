import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export function TableWrap({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="table-wrap"
      className={cn(
        "overflow-x-auto rounded-xl border border-border bg-surface p-5 shadow-[var(--ds-shadow-soft)]",
        className,
      )}
      {...props}
    />
  );
}

export function Table({
  className,
  ...props
}: ComponentProps<"table">) {
  return (
    <table
      data-slot="table"
      className={cn(
        "w-full border-collapse text-left text-sm tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

export type TrProps = ComponentProps<"tr"> & {
  /** Highlights the row, e.g. the active symbol in a watchlist. */
  selected?: boolean;
};

export function Tr({ className, selected, ...props }: TrProps) {
  return (
    <tr
      data-slot="table-row"
      data-selected={selected || undefined}
      className={cn(
        "transition-colors duration-(--ds-motion-fast) [tbody_&]:hover:bg-[var(--ds-row)] data-selected:bg-brand/8",
        className,
      )}
      {...props}
    />
  );
}

export function Th({
  className,
  scope = "col",
  ...props
}: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        "border-b border-[var(--ds-row)] py-3 pr-5 text-xs font-semibold tracking-widest text-muted uppercase last:pr-0",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "border-b border-[var(--ds-row)] py-4 pr-5 text-secondary last:pr-0 [tr:last-child_&]:border-b-0",
        className,
      )}
      {...props}
    />
  );
}
