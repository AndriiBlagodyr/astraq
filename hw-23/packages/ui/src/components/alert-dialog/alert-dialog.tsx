"use client";

import type { ComponentProps } from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "../../lib/cn";
import { overlay } from "../../lib/overlay";

// A Dialog that demands a decision: role="alertdialog", and clicking the
// backdrop does nothing. Escape still cancels. There is no close icon, so the
// footer must offer the way out:
//
// <AlertDialogFooter>
//   <AlertDialogClose render={<Button variant="secondary" />}>Cancel</AlertDialogClose>
//   <Button variant="danger" onClick={remove}>Delete</Button>
// </AlertDialogFooter>
//
// Focus lands on the first focusable element, which is the cancel button in
// that order: a stray Enter never confirms a destructive action.
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogClose = AlertDialogPrimitive.Close;

export type AlertDialogContentProps = Omit<
  ComponentProps<typeof AlertDialogPrimitive.Popup>,
  "title" | "className"
> & {
  title: string;
  /** Required: an alert dialog must say what's at stake. */
  description: string;
  className?: string;
};

export function AlertDialogContent({
  title,
  description,
  className,
  children,
  ...props
}: AlertDialogContentProps) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        data-slot="alert-dialog-overlay"
        className={overlay.backdrop}
      />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(overlay.dialog, "w-[min(92vw,28rem)]", className)}
        {...props}
      >
        <header>
          <AlertDialogPrimitive.Title className={overlay.title}>
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className={overlay.description}>
            {description}
          </AlertDialogPrimitive.Description>
        </header>
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"footer">) {
  return (
    <footer
      data-slot="alert-dialog-footer"
      className={cn(overlay.footer, className)}
      {...props}
    />
  );
}
