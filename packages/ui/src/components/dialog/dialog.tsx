"use client";

import type { ComponentProps } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { overlay } from "../../lib/overlay";
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
        className={overlay.backdrop}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(overlay.dialog, "w-[min(92vw,34rem)]", className)}
        {...props}
      >
        <header className="pr-10">
          <DialogPrimitive.Title className={overlay.title}>
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className={overlay.description}>
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
      className={cn(overlay.footer, className)}
      {...props}
    />
  );
}
