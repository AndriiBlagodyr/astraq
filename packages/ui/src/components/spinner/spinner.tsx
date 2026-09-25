import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export type SpinnerProps = ComponentProps<"span"> & {
  /** Accessible label. Omit when the parent already announces busy state. */
  label?: string;
};

export function Spinner({ label, className, ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        // Keeps spinning under reduced motion: it's the only progress signal.
        // The slower rotation is calmer without losing meaning.
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-[spin_1.6s_linear_infinite]",
        className,
      )}
      {...props}
    />
  );
}
