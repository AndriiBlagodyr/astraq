import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { Spinner } from "../spinner";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border font-semibold whitespace-nowrap select-none",
    "transition-[translate,scale,background-color,border-color,color,box-shadow,filter,opacity] duration-(--ds-motion-fast) ease-out",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    // Hover lifts, press sinks. Transforms only when motion is allowed.
    "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98]",
    // `disabled` for native buttons, `aria-disabled` for links and loading
    // buttons that must stay focusable.
    "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
    "aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-disabled:shadow-none",
    // Loading keeps full opacity: the spinner is the signal, not a faded button.
    "data-loading:aria-disabled:opacity-100",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[image:var(--ds-gradient-brand)] text-[var(--ds-brand-contrast)] shadow-[var(--ds-shadow-brand)] hover:brightness-110 active:brightness-95",
        secondary:
          "border-border-strong bg-surface-muted text-foreground hover:border-focus-ring/70 hover:bg-surface active:bg-surface-strong",
        ghost:
          "border-transparent bg-transparent text-secondary hover:bg-surface-muted hover:text-foreground active:bg-surface-strong",
        danger:
          "border-negative/35 bg-negative/12 text-negative-fg hover:border-negative/55 hover:bg-negative/18 active:bg-negative/24",
      },
      size: {
        sm: "min-h-9 px-4 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        md: "min-h-11 px-5 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "min-h-12 px-6 text-base [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /**
     * Shows a spinner and blocks activation while keeping the button focusable
     * and its width stable.
     */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  loading = false,
  type = "button",
  onClick,
  children,
  ...props
}: ButtonProps) {
  const ariaDisabled = props["aria-disabled"];
  const blocked = loading || ariaDisabled === true || ariaDisabled === "true";

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // aria-disabled keeps the button focusable, so keyboard activation still
    // fires click; block it here.
    if (blocked) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      type={type}
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
      aria-disabled={blocked || undefined}
      onClick={handleClick}
    >
      {/* `contents` keeps children in the flex layout; `invisible` preserves width while loading. */}
      <span className={cn("contents", loading && "invisible")}>{children}</span>
      {loading ? <Spinner className="absolute inset-0 m-auto" /> : null}
    </button>
  );
}

const iconButtonSize = {
  sm: "size-9",
  md: "size-11",
  lg: "size-12",
} as const;

export type IconButtonProps = Omit<ButtonProps, "children"> & {
  /** Required: icon-only buttons have no visible text. */
  label: string;
  children: ReactNode;
};

export function IconButton({
  label,
  size,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      size={size}
      className={cn(
        "min-h-0 px-0",
        iconButtonSize[size ?? "md"],
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
