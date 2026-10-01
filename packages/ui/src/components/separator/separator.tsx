"use client";

import type { ComponentProps } from "react";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";

export type SeparatorProps = WithClassName<ComponentProps<typeof SeparatorPrimitive>>;

/**
 * A hairline between groups of content (`role="separator"`). A vertical
 * separator stretches to its flex row's height. For a purely visual rule,
 * a border on the parent is simpler.
 */
export function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
        "data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch",
        className,
      )}
      {...props}
    />
  );
}
