"use client";

import type { ComponentProps } from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";

export const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted align-middle font-semibold text-secondary select-none",
  {
    variants: {
      size: {
        sm: "size-6 text-[0.625rem]",
        md: "size-8 text-xs",
        lg: "size-11 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type AvatarProps = WithClassName<ComponentProps<typeof AvatarPrimitive.Root>> &
  VariantProps<typeof avatarVariants>;

/**
 * A user or entity picture with a fallback: initials or an icon. Base UI
 * shows the fallback until the image loads, and keeps it if loading fails.
 */
export function Avatar({ className, size, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  );
}

export type AvatarImageProps = WithClassName<ComponentProps<typeof AvatarPrimitive.Image>>;

/** Give it `alt` (the person's name), or `alt=""` when the name sits beside it. */
export function AvatarImage({ className, ...props }: AvatarImageProps) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("size-full object-cover", className)}
      {...props}
    />
  );
}

export type AvatarFallbackProps = WithClassName<ComponentProps<typeof AvatarPrimitive.Fallback>>;

/**
 * Initials or an icon. Set `delay` (ms) to skip a flash of initials when the
 * image usually loads quickly.
 */
export function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center uppercase [&_svg]:size-1/2",
        className,
      )}
      {...props}
    />
  );
}
