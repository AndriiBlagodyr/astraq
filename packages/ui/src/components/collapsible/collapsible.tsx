"use client";

import type { ComponentProps } from "react";
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { disclosure } from "../../lib/disclosure";
import type { WithClassName } from "../../lib/types";

// One section that shows and hides: advanced filters, raw payload details.
// For a stack of headed sections, use Accordion.

export type CollapsibleProps = WithClassName<ComponentProps<typeof CollapsiblePrimitive.Root>>;

export function Collapsible({ className, ...props }: CollapsibleProps) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

export type CollapsibleTriggerProps = WithClassName<
  ComponentProps<typeof CollapsiblePrimitive.Trigger>
> & {
  /** Hide the chevron, e.g. when rendering a Button with its own icon. */
  hideChevron?: boolean;
};

/** A text button with a chevron. Pass `render={<Button variant="ghost" />}` for a button look. */
export function CollapsibleTrigger({
  className,
  children,
  hideChevron = false,
  ...props
}: CollapsibleTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "group inline-flex w-fit cursor-pointer items-center gap-2 rounded-sm text-sm font-semibold text-secondary",
        "transition-colors duration-(--ds-motion-fast) hover:text-foreground",
        "data-disabled:cursor-not-allowed data-disabled:opacity-45 data-disabled:hover:text-secondary",
        className,
      )}
      {...props}
    >
      {children}
      {hideChevron ? null : <ChevronDown aria-hidden="true" className={disclosure.chevron} />}
    </CollapsiblePrimitive.Trigger>
  );
}

export type CollapsiblePanelProps = WithClassName<
  ComponentProps<typeof CollapsiblePrimitive.Panel>
>;

export function CollapsiblePanel({ className, ...props }: CollapsiblePanelProps) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-panel"
      className={cn(disclosure.panel, className)}
      {...props}
    />
  );
}
