"use client";

// Client: Button always attaches a click handler (it blocks activation while
// loading or aria-disabled), and handlers can't cross the server boundary.
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { Spinner } from "../spinner";
import { buttonVariants } from "./button-variants";

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
      {/* `contents` keeps children in the flex layout. Loading hides them by
          color and opacity, not `invisible`: width holds and, unlike
          visibility, the text still names the button for screen readers. */}
      <span
        className={cn(
          "contents",
          loading && "text-transparent [&_*]:opacity-0",
        )}
      >
        {children}
      </span>
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
      className={cn("min-h-0 px-0", iconButtonSize[size ?? "md"], className)}
      {...props}
    >
      {children}
    </Button>
  );
}
