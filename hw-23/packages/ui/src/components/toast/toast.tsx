"use client";

import type { ReactNode } from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button, IconButton } from "../button";
import { feedbackTone } from "../feedback/feedback";

// Queue toasts from anywhere under <ToastProvider>:
//
//   const toast = useToastManager();
//   toast.add({ title: "Order filled", description: "Bought 10 AAPL", type: "success" });
//
// `type` picks the tone (ToastTone, default "info"). For undo, pass
// `actionProps: { children: "Undo", onClick: restore }`. Use `priority: "high"`
// for failures the user must hear about now; the rest are announced politely.
//
// Toasts pause while the stack is hovered or focused, F6 moves focus into the
// stack, and swiping right or down dismisses one. Provided by Base UI.
export type ToastTone = keyof typeof feedbackTone;

export const useToastManager = ToastPrimitive.useToastManager;
/** A manager for queueing toasts outside React (e.g. in a fetch wrapper). */
export const createToastManager = ToastPrimitive.createToastManager;

export type ToastProviderProps = {
  children: ReactNode;
  /** Visible toasts; older ones collapse out of view. @default 3 */
  limit?: number;
  /** Auto-dismiss delay in ms; 0 keeps toasts until dismissed. @default 5000 */
  timeout?: number;
  /** From `createToastManager()`, to add toasts from outside React. */
  toastManager?: ToastPrimitive.Provider.Props["toastManager"];
};

/** Render once near the app root. Owns the stack's live region and viewport. */
export function ToastProvider({
  children,
  limit = 3,
  timeout = 5000,
  toastManager,
}: ToastProviderProps) {
  return (
    <ToastPrimitive.Provider
      limit={limit}
      timeout={timeout}
      toastManager={toastManager}
    >
      {children}
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport
          data-slot="toast-viewport"
          className="fixed right-4 bottom-4 z-60 w-[calc(100vw-2rem)] outline-none sm:right-6 sm:bottom-6 sm:w-90"
        >
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

// Base UI's stacking recipe: collapsed toasts peek out behind the front one
// and scale down; hovering or focusing the stack fans them out. Durations
// read motion tokens, so reduced motion makes every change instant.
const rootClassName = cn(
  "[--gap:0.75rem] [--peek:0.75rem]",
  "[--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
  "[--height:var(--toast-frontmost-height,var(--toast-height))]",
  "[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
  "absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom select-none",
  "h-(--height) data-expanded:h-(--toast-height)",
  "rounded-lg border border-border-strong bg-surface-strong text-foreground shadow-soft backdrop-blur-overlay",
  // Bridges the gap between fanned-out toasts so hover doesn't flicker.
  "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
  "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
  "data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
  // Enter rises from below; exit follows the swipe, or drops back down.
  "data-starting-style:[transform:translateY(150%)]",
  "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
  "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
  "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
  "data-ending-style:opacity-0 data-limited:opacity-0",
  "[transition:transform_var(--ds-motion-slow)_var(--ds-ease-out),opacity_var(--ds-motion-slow),height_var(--ds-motion-fast)]",
);

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toast) => {
    const tone: ToastTone =
      toast.type && toast.type in feedbackTone ? (toast.type as ToastTone) : "info";
    const { icon, Icon } = feedbackTone[tone];

    return (
      <ToastPrimitive.Root
        key={toast.id}
        toast={toast}
        data-slot="toast"
        data-tone={tone}
        className={rootClassName}
      >
        <ToastPrimitive.Content className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 overflow-hidden p-4 transition-opacity duration-(--ds-motion-base) data-behind:opacity-0 data-expanded:opacity-100">
          {/* Icon + color: tone never relies on color alone (WCAG 1.4.1). */}
          <Icon aria-hidden="true" className={cn("mt-0.5 size-4", icon)} />
          <div className="min-w-0">
            <ToastPrimitive.Title className="m-0 text-sm font-semibold text-foreground" />
            <ToastPrimitive.Description className="mt-1 mb-0 text-sm leading-6 text-secondary" />
            {toast.actionProps ? (
              <ToastPrimitive.Action
                className="mt-3"
                render={<Button variant="secondary" size="sm" />}
              />
            ) : null}
          </div>
          <ToastPrimitive.Close
            render={
              <IconButton
                label="Dismiss notification"
                variant="ghost"
                size="sm"
                className="-mt-1.5 -mr-1.5 size-7"
              >
                <X aria-hidden="true" />
              </IconButton>
            }
          />
        </ToastPrimitive.Content>
      </ToastPrimitive.Root>
    );
  });
}
