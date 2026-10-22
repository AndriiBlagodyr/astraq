"use client";

import type { ComponentProps } from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";

// One thumb per value: pass a number for a single slider, an array for a
// range. Keyboard: arrows step by `step`, Shift+arrow and PageUp/Down by
// `largeStep`, Home/End jump to the ends. Provided by Base UI.
//
// Put SliderLabel and SliderValue in `children`; they render above the track.
// A range needs a name per thumb (`thumbLabels`); in a Field, a FieldLabel
// names a single-thumb slider.

export type SliderProps = WithClassName<ComponentProps<typeof SliderPrimitive.Root>> & {
  /** Accessible name per thumb, e.g. ["Minimum price", "Maximum price"]. */
  thumbLabels?: string[];
};

export function Slider({ className, thumbLabels, children, ...props }: SliderProps) {
  const values = props.value ?? props.defaultValue;
  const count = Array.isArray(values) ? values.length : 1;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto",
        className,
      )}
      {...props}
    >
      {children}
      <SliderPrimitive.Control
        data-slot="slider-control"
        className={cn(
          "col-span-2 flex w-full touch-none items-center py-2 select-none",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:justify-center data-[orientation=vertical]:px-2 data-[orientation=vertical]:py-0",
          "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        )}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(
            "relative h-1.5 w-full rounded-pill bg-border-control/35",
            "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-32 data-[orientation=vertical]:w-1.5",
          )}
        >
          <SliderPrimitive.Indicator
            data-slot="slider-indicator"
            className="rounded-pill bg-checked"
          />
          {Array.from({ length: count }, (_, index) => (
            <SliderPrimitive.Thumb
              key={index}
              index={index}
              data-slot="slider-thumb"
              aria-label={thumbLabels?.[index]}
              className={cn(
                // The thumb is the state: a checked-color ring on a raised
                // fill, so it clears 3:1 against the track and every surface.
                "size-5 cursor-grab rounded-pill border-2 border-checked bg-surface-strong shadow-sm",
                "transition-[scale,box-shadow] duration-(--ds-motion-fast) ease-out",
                "hover:shadow-[0_0_0_6px_var(--ds-focus-halo)] data-dragging:cursor-grabbing motion-safe:data-dragging:scale-110",
                // The focusable input sits inside the thumb.
                "has-[:focus-visible]:outline-(length:--ds-focus-width) has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring has-[:focus-visible]:outline-solid",
                "data-disabled:cursor-not-allowed data-disabled:hover:shadow-sm",
              )}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export type SliderLabelProps = WithClassName<ComponentProps<typeof SliderPrimitive.Label>>;

export function SliderLabel({ className, ...props }: SliderLabelProps) {
  return (
    <SliderPrimitive.Label
      data-slot="slider-label"
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export type SliderValueProps = WithClassName<ComponentProps<typeof SliderPrimitive.Value>>;

/** The formatted value(s), e.g. "20 – 80". Formats with the Slider's `format`. */
export function SliderValue({ className, ...props }: SliderValueProps) {
  return (
    <SliderPrimitive.Value
      data-slot="slider-value"
      className={cn("justify-self-end text-sm text-secondary tabular-nums", className)}
      {...props}
    />
  );
}
