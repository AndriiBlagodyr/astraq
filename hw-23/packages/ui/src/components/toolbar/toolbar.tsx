"use client";

import type { ComponentProps } from "react";
import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar";
import type { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";
import { toggleVariants } from "../toggle";

// A row of controls with one tab stop: Tab enters and leaves the toolbar,
// arrow keys move inside it (Base UI). Chart tools, table actions.
//
// Toggles and select triggers join the roving focus through `render`:
//   <ToolbarButton render={<Toggle />} aria-label="Log scale">…</ToolbarButton>
// Label every group, and every icon-only button.

export type ToolbarProps = WithClassName<ComponentProps<typeof ToolbarPrimitive.Root>>;

export function Toolbar({ className, ...props }: ToolbarProps) {
  return (
    <ToolbarPrimitive.Root
      data-slot="toolbar"
      className={cn(
        "flex w-fit items-center gap-1 rounded-lg border border-border bg-surface p-1",
        "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className,
      )}
      {...props}
    />
  );
}

export type ToolbarGroupProps = WithClassName<ComponentProps<typeof ToolbarPrimitive.Group>>;

/** Related buttons. Give it an `aria-label` ("Chart type"). */
export function ToolbarGroup({ className, ...props }: ToolbarGroupProps) {
  return (
    <ToolbarPrimitive.Group
      data-slot="toolbar-group"
      className={cn(
        "flex items-center gap-1 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className,
      )}
      {...props}
    />
  );
}

export type ToolbarButtonProps = WithClassName<ComponentProps<typeof ToolbarPrimitive.Button>> &
  VariantProps<typeof toggleVariants>;

/**
 * Looks like a ghost Toggle, so plain buttons and toggles line up. Disabled
 * buttons stay focusable by default, so arrow keys don't skip over them.
 */
export function ToolbarButton({ className, variant, size = "sm", ...props }: ToolbarButtonProps) {
  return (
    <ToolbarPrimitive.Button
      data-slot="toolbar-button"
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export type ToolbarLinkProps = WithClassName<ComponentProps<typeof ToolbarPrimitive.Link>>;

export function ToolbarLink({ className, ...props }: ToolbarLinkProps) {
  return (
    <ToolbarPrimitive.Link
      data-slot="toolbar-link"
      className={cn(
        "inline-flex items-center rounded-sm px-2 text-xs font-semibold whitespace-nowrap text-secondary",
        "transition-colors duration-(--ds-motion-fast) hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export type ToolbarSeparatorProps = WithClassName<
  ComponentProps<typeof ToolbarPrimitive.Separator>
>;

/** Takes the opposite orientation of the toolbar: a vertical rule in a row. */
export function ToolbarSeparator({ className, ...props }: ToolbarSeparatorProps) {
  return (
    <ToolbarPrimitive.Separator
      data-slot="toolbar-separator"
      className={cn(
        "shrink-0 bg-border",
        "data-[orientation=vertical]:mx-1 data-[orientation=vertical]:h-5 data-[orientation=vertical]:w-px",
        "data-[orientation=horizontal]:my-1 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
        className,
      )}
      {...props}
    />
  );
}
