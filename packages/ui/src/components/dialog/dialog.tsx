"use client";

import type { ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { IconButton } from "../button";

// Keyboard: focus moves into the dialog on open and is trapped there, Escape
// closes, and focus returns to the trigger on close. Provided by Radix.
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export type DialogContentProps = Omit<
  ComponentProps<typeof DialogPrimitive.Content>,
  "title"
> & {
  title: string;
  description?: string;
};

export function DialogContent({
  title,
  description,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-[var(--ds-overlay)] backdrop-blur-sm data-[state=closed]:animate-ds-fade-out data-[state=open]:animate-ds-fade-in motion-reduce:animate-none"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl border border-border-strong bg-surface-strong p-6 shadow-[var(--ds-shadow-soft)] outline-none",
          "data-[state=closed]:animate-ds-pop-out data-[state=open]:animate-ds-pop-in motion-reduce:animate-none",
          className,
        )}
        // Without a description, opt out explicitly so Radix doesn't point
        // aria-describedby at a missing element.
        {...(description ? {} : { "aria-describedby": undefined })}
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
        <DialogPrimitive.Close asChild>
          <IconButton
            label="Close dialog"
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4"
          >
            <X aria-hidden="true" />
          </IconButton>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
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
