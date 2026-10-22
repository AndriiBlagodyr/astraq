import type { ComponentProps } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/cn";

// Plain HTML table parts, RSC-safe. Padding reads the density tokens
// (`py-cell-y`, `py-head-y`, `px-inset-md`), so `data-density="compact"` on
// any ancestor, the TableWrap included, tightens one table on its own.

export type TableWrapProps = ComponentProps<"div"> & {
  /**
   * Makes the wrap the scroll container in both directions, so `sticky`
   * headers stick to it. Give it a height or max-height with `className`.
   * It becomes a Tab stop so keyboard users can scroll it; name it with
   * `aria-label` and `role="region"`.
   */
  scroll?: boolean;
};

export function TableWrap({ className, scroll = false, ...props }: TableWrapProps) {
  return (
    <div
      data-slot="table-wrap"
      data-scroll={scroll || undefined}
      tabIndex={scroll ? 0 : undefined}
      className={cn(
        "overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-surface shadow-soft",
        // A padded scroll container would let rows show above a stuck header.
        scroll ? "overflow-y-auto" : "py-2",
        className,
      )}
      {...props}
    />
  );
}

export type TableProps = ComponentProps<"table"> & {
  /**
   * Keeps the header row in view while the TableWrap (with `scroll`) or the
   * page scrolls.
   */
  sticky?: boolean;
};

export function Table({ className, sticky = false, ...props }: TableProps) {
  return (
    <table
      data-slot="table"
      data-sticky={sticky || undefined}
      className={cn(
        // `separate` with no spacing, not `collapse`: collapsed borders belong
        // to the table, so a stuck header cell would scroll without its rule.
        "w-full border-separate border-spacing-0 text-left text-sm tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

export function Thead({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        // Sticky cells need an opaque fill; glass surfaces blur what passes under.
        "[[data-sticky]>&_th]:sticky [[data-sticky]>&_th]:top-0 [[data-sticky]>&_th]:z-10",
        "[[data-sticky]>&_th]:bg-surface-strong [[data-sticky]>&_th]:backdrop-blur-surface",
        className,
      )}
      {...props}
    />
  );
}

export function Tbody(props: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" {...props} />;
}

export function Tfoot({ className, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("font-semibold [&_td]:border-t [&_td]:border-b-0 [&_td]:text-foreground", className)}
      {...props}
    />
  );
}

/** Names the table. Use `className="sr-only"` to keep it for screen readers only. */
export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("px-inset-md pb-head-y text-left text-sm font-semibold text-foreground", className)}
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
        // A wash of the ink color, not a border token: the contrast theme's
        // borders are mid-grey, and text on them failed 4.5:1.
        "transition-colors duration-(--ds-motion-fast) [tbody_&]:hover:bg-foreground/5 data-selected:bg-brand/8",
        className,
      )}
      {...props}
    />
  );
}

const alignClassName = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
} as const;

export type TableAlign = keyof typeof alignClassName;

export type ThProps = Omit<ComponentProps<"th">, "align"> & {
  /** `end` for numbers, so digits line up. @default "start" */
  align?: TableAlign;
  /**
   * Sets `aria-sort` on a sortable column. Only one column should be sorted
   * at a time as far as `aria-sort` is concerned; mark the primary one.
   */
  sort?: "ascending" | "descending" | "none";
};

export function Th({ className, scope = "col", align = "start", sort, ...props }: ThProps) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      data-align={align}
      aria-sort={sort}
      className={cn(
        "border-b border-border-subtle px-inset-md py-head-y text-xs font-semibold tracking-widest whitespace-nowrap text-muted uppercase",
        alignClassName[align],
        // A sort button fills the cell's padding so the whole header is the target.
        sort && "py-0",
        className,
      )}
      {...props}
    />
  );
}

export type TdProps = Omit<ComponentProps<"td">, "align"> & {
  /** `end` for numbers, so digits line up. @default "start" */
  align?: TableAlign;
};

export function Td({ className, align = "start", ...props }: TdProps) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "border-b border-border-subtle px-inset-md py-cell-y text-secondary [tbody>tr:last-child>&]:border-b-0",
        alignClassName[align],
        className,
      )}
      {...props}
    />
  );
}

export type TableSortButtonProps = ComponentProps<"button"> & {
  /** The column's current direction, or `false` when it isn't sorted. */
  direction: "asc" | "desc" | false;
  /** Shown for multi-column sorts: 1 is the primary sort. */
  index?: number;
};

/**
 * The header control of a sortable column. Put it inside a `Th` with `sort`
 * set; the `th` carries the state (`aria-sort`), the button only toggles it.
 */
export function TableSortButton({
  className,
  direction,
  index,
  type = "button",
  children,
  ...props
}: TableSortButtonProps) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <button
      type={type}
      data-slot="table-sort-button"
      data-sorted={direction || undefined}
      className={cn(
        // Stretches over the th's inline padding, so the whole cell sorts.
        "-mx-inset-md inline-flex w-[calc(100%+2*var(--spacing-inset-md))] cursor-pointer items-center gap-1.5 px-inset-md py-head-y",
        "tracking-[inherit] text-inherit uppercase",
        "transition-colors duration-(--ds-motion-fast) hover:text-foreground data-sorted:text-foreground",
        "[[data-align=end]>&]:flex-row-reverse [[data-align=center]>&]:justify-center",
        "focus-visible:-outline-offset-2",
        className,
      )}
      {...props}
    >
      {children}
      <Icon
        aria-hidden="true"
        className={cn("size-3.5 shrink-0", direction ? "text-brand-fg" : "opacity-50")}
      />
      {direction && index !== undefined ? (
        <span aria-hidden="true" className="text-[0.625rem] text-brand-fg">
          {index}
        </span>
      ) : null}
    </button>
  );
}
