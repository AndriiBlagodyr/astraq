import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

export const kbdVariants = cva(
  "inline-flex items-center justify-center rounded-sm border border-b-2 border-border-strong bg-surface-muted font-mono font-medium whitespace-nowrap text-secondary [&_svg]:shrink-0",
  {
    variants: {
      size: {
        sm: "min-h-5 min-w-5 px-1 text-[0.6875rem] [&_svg]:size-3",
        md: "min-h-6 min-w-6 px-1.5 text-xs [&_svg]:size-3.5",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type KbdProps = ComponentProps<"kbd"> & VariantProps<typeof kbdVariants>;

/**
 * A key to press, in prose, tooltips and the shortcut overlay. Symbol and
 * icon keys need hidden text (`aria-label` isn't allowed on `kbd`):
 * `<Kbd><span aria-hidden="true">⌘</span><span className="sr-only">Command</span></Kbd>`.
 * In menus, use MenuShortcut instead: it's a quieter hint. Safe in Server
 * Components.
 */
export function Kbd({ className, size, ...props }: KbdProps) {
  return <kbd data-slot="kbd" className={cn(kbdVariants({ size }), className)} {...props} />;
}

export type KbdGroupProps = ComponentProps<"kbd">;

/** A key combination. A `kbd` holding `kbd`s is the HTML for "press together". */
export function KbdGroup({ className, ...props }: KbdGroupProps) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1 font-sans text-xs text-muted", className)}
      {...props}
    />
  );
}
