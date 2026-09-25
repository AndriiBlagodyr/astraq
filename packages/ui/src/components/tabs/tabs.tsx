"use client";

import type { ComponentProps } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/cn";

// Keyboard: Arrow keys move between tabs (wrapping), Home/End jump to the
// ends, and focus selects the tab (automatic activation). Provided by Radix.
export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-xs font-semibold whitespace-nowrap text-muted select-none",
        "transition-[background-color,color,box-shadow,scale] duration-(--ds-motion-fast) ease-out",
        "hover:text-foreground motion-safe:active:scale-[0.97]",
        "data-[state=active]:bg-brand/12 data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      // The panel is focusable (Tab from the list lands here), so it keeps a
      // visible focus indicator.
      className={cn(
        "mt-4 rounded-lg data-[state=active]:animate-ds-fade-in",
        className,
      )}
      {...props}
    />
  );
}
