"use client";

import type { ComponentProps } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "../../lib/cn";

// Keyboard: Arrow keys move between tabs (wrapping), Home/End jump to the
// ends, and focus selects the tab (automatic activation). Provided by Base UI.
export const Tabs = TabsPrimitive.Root;

export type TabsListProps = Omit<
  ComponentProps<typeof TabsPrimitive.List>,
  "className"
> & { className?: string };

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      activateOnFocus
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1",
        className,
      )}
      {...props}
    />
  );
}

export type TabsTriggerProps = Omit<
  ComponentProps<typeof TabsPrimitive.Tab>,
  "className"
> & { className?: string };

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-xs font-semibold whitespace-nowrap text-muted select-none",
        "transition-[background-color,color,box-shadow,scale] duration-(--ds-motion-fast) ease-out",
        "hover:text-foreground motion-safe:active:scale-[0.97]",
        "data-active:bg-brand/12 data-active:text-foreground data-active:shadow-sm",
        "data-disabled:cursor-not-allowed data-disabled:opacity-45 data-disabled:hover:text-muted",
        className,
      )}
      {...props}
    />
  );
}

export type TabsContentProps = Omit<
  ComponentProps<typeof TabsPrimitive.Panel>,
  "className"
> & { className?: string };

export function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      // The panel is focusable (Tab from the list lands here), so it keeps a
      // visible focus indicator.
      className={cn(
        "mt-4 rounded-lg transition-opacity duration-(--ds-motion-base) ease-out data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}
