"use client";

import type { ComponentProps } from "react";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { cn } from "../../lib/cn";
import { popup } from "../../lib/popup";
import { PopupArrow } from "../../lib/popup-arrow";

// A rich preview of a link's destination (a symbol's quote, a strategy's
// stats), shown on hover after a delay and on keyboard focus. The card is a
// sighted-pointer extra: it isn't announced, so the link must make sense
// alone, and nothing essential may live only in the card. Provided by Base UI.
export const PreviewCard = PreviewCardPrimitive.Root;

export type PreviewCardTriggerProps = Omit<
  ComponentProps<typeof PreviewCardPrimitive.Trigger>,
  "className"
> & { className?: string };

/** Renders an `<a>`; pass `href`. Compose another link with `render`. */
export function PreviewCardTrigger({ className, ...props }: PreviewCardTriggerProps) {
  return (
    <PreviewCardPrimitive.Trigger
      data-slot="preview-card-trigger"
      className={cn(
        "font-semibold text-brand-fg underline decoration-brand-fg/40 underline-offset-4 transition-colors duration-(--ds-motion-fast) hover:decoration-brand-fg data-popup-open:decoration-brand-fg",
        className,
      )}
      {...props}
    />
  );
}

export type PreviewCardContentProps = Omit<
  ComponentProps<typeof PreviewCardPrimitive.Popup>,
  "className"
> & {
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  arrow?: boolean;
};

export function PreviewCardContent({
  className,
  side = "bottom",
  align = "center",
  arrow = false,
  children,
  ...props
}: PreviewCardContentProps) {
  return (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={arrow ? 10 : 8}
        collisionPadding={8}
        className={popup.positioner}
      >
        <PreviewCardPrimitive.Popup
          data-slot="preview-card"
          className={cn(
            popup.surface,
            popup.motion,
            "w-80 max-w-(--available-width) p-4 text-sm",
            className,
          )}
          {...props}
        >
          {children}
          {arrow ? (
            <PreviewCardPrimitive.Arrow className={popup.arrow}>
              <PopupArrow />
            </PreviewCardPrimitive.Arrow>
          ) : null}
        </PreviewCardPrimitive.Popup>
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  );
}
