"use client";

import type { ComponentProps } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { IconButton } from "../button";

// Keyboard: focus moves into the dialog on open and is trapped there, Escape
// closes, and focus returns to the trigger on close. Provided by Base UI.
// Compose a custom trigger or close button with `render`:
// <DialogTrigger render={<Button />}>Review order</DialogTrigger>
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export type DialogContentProps = Omit<
  ComponentProps<typeof DialogPrimitive.Popup>,
  "title" | "className"
> & {
  title: string;
  description?: string;
  className?: string;
};

// Exits are shorter than entries so dismissals feel immediate. Durations read
// motion tokens, which drop to 0ms under prefers-reduced-motion.
const exitTiming =
  "data-ending-style:duration-(--ds-motion-fast) data-ending-style:ease-in";

export function DialogContent({
  title,
  description,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className={cn(
          "fixed inset-0 z-50 bg-overlay backdrop-blur-overlay",
          "transition-opacity duration-(--ds-motion-base) ease-out",
          "data-starting-style:opacity-0 data-ending-style:opacity-0",
          exitTiming,
        )}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl border border-border-strong bg-surface-strong p-6 shadow-soft outline-none",
          "transition-[opacity,scale] duration-(--ds-motion-base) ease-out",
          "data-starting-style:scale-96 data-starting-style:opacity-0 data-ending-style:scale-96 data-ending-style:opacity-0",
          exitTiming,
          className,
        )}
        {...props}
      >
        <header className="pr-10">
          <DialogPrimitive.Title className="m-0 font-display text-xl font-bold text-balance text-foreground">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-2 mb-0 text-sm leading-6 text-pretty text-secondary">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </header>
        {children}
        <DialogPrimitive.Close
          render={
            <IconButton
              label="Close dialog"
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4"
            >
              <X aria-hidden="true" />
            </IconButton>
          }
        />
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

/** Right-aligned action row; stacks on narrow screens with the primary action first. */
export function DialogFooter({ className, ...props }: ComponentProps<"footer">) {
  return (
    <footer
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
