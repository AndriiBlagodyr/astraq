"use client";

import type { ComponentProps } from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { disclosure } from "../../lib/disclosure";
import type { WithClassName } from "../../lib/types";

// Stacked sections with headings; one open at a time unless `multiple`.
// Base UI wires the trigger's `aria-expanded` / `aria-controls` and the
// panel's region role. Triggers are plain Tab stops: the APG accordion
// pattern dropped arrow-key roving focus, and Base UI 1.8 follows it.

export type AccordionProps = WithClassName<ComponentProps<typeof AccordionPrimitive.Root>>;

export function Accordion({ className, ...props }: AccordionProps) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("grid w-full", className)}
      {...props}
    />
  );
}

export type AccordionItemProps = WithClassName<ComponentProps<typeof AccordionPrimitive.Item>>;

export function AccordionItem({ className, ...props }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    />
  );
}

export type AccordionTriggerProps = WithClassName<
  ComponentProps<typeof AccordionPrimitive.Trigger>
>;

/** The button, inside an `h3` heading (Base UI Accordion.Header). */
export function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header data-slot="accordion-header" className="m-0">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex w-full cursor-pointer items-center justify-between gap-4 rounded-sm py-3 text-left text-sm font-semibold text-foreground",
          "transition-colors duration-(--ds-motion-fast) hover:text-brand-fg",
          "data-disabled:cursor-not-allowed data-disabled:opacity-45 data-disabled:hover:text-foreground",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown aria-hidden="true" className={disclosure.chevron} />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export type AccordionPanelProps = WithClassName<ComponentProps<typeof AccordionPrimitive.Panel>>;

/** `className` styles the padded content box inside the panel. */
export function AccordionPanel({ className, children, ...props }: AccordionPanelProps) {
  return (
    <AccordionPrimitive.Panel data-slot="accordion-panel" className={disclosure.panel} {...props}>
      <div className={cn("pb-4 text-sm leading-6 text-secondary", className)}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}
