"use client";

import type { ComponentProps } from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";

// Edge fades: an edge with more content past it fades out over up to 2rem.
// Base UI sets how far the viewport is from each edge, and min() grows the
// fade in as you scroll away from an edge instead of popping it.
const FADE_Y =
  "mask-[linear-gradient(to_bottom,transparent_0,black_min(2rem,var(--scroll-area-overflow-y-start,0px)),black_calc(100%-min(2rem,var(--scroll-area-overflow-y-end,0px))),transparent_100%)]";
const FADE_X =
  "mask-[linear-gradient(to_right,transparent_0,black_min(2rem,var(--scroll-area-overflow-x-start,0px)),black_calc(100%-min(2rem,var(--scroll-area-overflow-x-end,0px))),transparent_100%)]";

// The mask would clip the viewport's own outline, so the root draws it.
// Spelled out in full: Tailwind only generates classes it finds as literals.
const FOCUS_RING = [
  "has-[>[data-slot=scroll-area-viewport]:focus-visible]:outline-solid",
  "has-[>[data-slot=scroll-area-viewport]:focus-visible]:outline-(length:--ds-focus-width)",
  "has-[>[data-slot=scroll-area-viewport]:focus-visible]:outline-offset-2",
  "has-[>[data-slot=scroll-area-viewport]:focus-visible]:outline-focus-ring",
];

export type ScrollAreaProps = WithClassName<ComponentProps<typeof ScrollAreaPrimitive.Root>> & {
  /** Which scrollbars to render. @default "vertical" */
  scrollbars?: "vertical" | "horizontal" | "both";
  /** Fade edges that have more content past them. @default true */
  fade?: boolean;
  /** Classes for the content box (padding, grid). */
  contentClassName?: string;
};

/**
 * A scroll container with themed overlay scrollbars that show while hovering
 * or scrolling. Size it with `className` (a height or max-height). The
 * viewport is keyboard focusable while it overflows, so arrow keys scroll it.
 */
export function ScrollArea({
  className,
  contentClassName,
  scrollbars = "vertical",
  fade = true,
  children,
  ...props
}: ScrollAreaProps) {
  const vertical = scrollbars !== "horizontal";
  const horizontal = scrollbars !== "vertical";

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative flex min-h-0 overflow-hidden rounded-md", FOCUS_RING, className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "min-h-0 w-full overscroll-contain rounded-[inherit] focus-visible:outline-none",
          fade && vertical && FADE_Y,
          // Masks don't combine; with both bars, only the vertical edges fade.
          fade && horizontal && !vertical && FADE_X,
        )}
      >
        <ScrollAreaPrimitive.Content data-slot="scroll-area-content" className={contentClassName}>
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      {vertical ? <ScrollBar orientation="vertical" /> : null}
      {horizontal ? <ScrollBar orientation="horizontal" /> : null}
      {vertical && horizontal ? <ScrollAreaPrimitive.Corner /> : null}
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({ orientation }: { orientation: "vertical" | "horizontal" }) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "pointer-events-none m-0.5 flex rounded-pill opacity-0",
        "transition-opacity duration-(--ds-motion-base) ease-in",
        "data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:w-1.5",
        // Shows at once while scrolling, then fades out once it stops.
        "data-hovering:pointer-events-auto data-hovering:opacity-100",
        "data-scrolling:pointer-events-auto data-scrolling:opacity-100 data-scrolling:duration-0",
      )}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="w-full rounded-pill bg-border-strong transition-colors duration-(--ds-motion-fast) hover:bg-muted"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}
