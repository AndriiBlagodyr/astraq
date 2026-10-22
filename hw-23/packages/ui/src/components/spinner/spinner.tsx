import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

export const spinnerVariants = cva(
  // Keeps spinning under reduced motion: it's the only progress signal.
  // The slower rotation is calmer without losing meaning.
  "inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent motion-reduce:animate-[spin_1.6s_linear_infinite]",
  {
    variants: {
      size: {
        sm: "size-3 border-[1.5px]",
        md: "size-4 border-2",
        lg: "size-6 border-[2.5px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type SpinnerProps = ComponentProps<"span"> &
  VariantProps<typeof spinnerVariants> & {
    /** Accessible label. Omit when the parent already announces busy state. */
    label?: string;
  };

export function Spinner({ label, size, className, ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  );
}
