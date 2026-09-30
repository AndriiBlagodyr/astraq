"use client";

import { createContext, use, type ComponentProps } from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { overlay } from "../../lib/overlay";
import { IconButton } from "../button";

// A modal panel that slides in from an edge. Keyboard and focus behave like
// Dialog: focus is trapped, Escape closes, focus returns to the trigger.
// Dragging it toward the edge it came from dismisses it. Text inside stays
// selectable with a mouse.
// Provided by Base UI.
//
// Side panels (order ticket, filters) use "right" or "left". "bottom" is a
// sheet for narrow screens and gets a drag handle instead of a close icon.
export type DrawerSide = "right" | "left" | "bottom";

const DrawerSideContext = createContext<DrawerSide>("right");

export type DrawerProps = Omit<
  DrawerPrimitive.Root.Props,
  "swipeDirection"
> & {
  side?: DrawerSide;
};

export function Drawer({ side = "right", ...props }: DrawerProps) {
  return (
    <DrawerSideContext value={side}>
      <DrawerPrimitive.Root
        swipeDirection={side === "bottom" ? "down" : side}
        {...props}
      />
    </DrawerSideContext>
  );
}

export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerClose = DrawerPrimitive.Close;

const viewportSide: Record<DrawerSide, string> = {
  right: "justify-end",
  left: "justify-start",
  bottom: "items-end",
};

// The popup follows the finger while swiping (`--drawer-swipe-movement-*`),
// and slides fully off its edge on enter and exit.
const popupSide: Record<DrawerSide, string> = {
  right: cn(
    "h-full w-[min(26rem,calc(100vw-3rem))] border-l",
    "[transform:translateX(var(--drawer-swipe-movement-x))]",
    "data-starting-style:[transform:translateX(100%)] data-ending-style:[transform:translateX(100%)]",
  ),
  left: cn(
    "h-full w-[min(26rem,calc(100vw-3rem))] border-r",
    "[transform:translateX(var(--drawer-swipe-movement-x))]",
    "data-starting-style:[transform:translateX(-100%)] data-ending-style:[transform:translateX(-100%)]",
  ),
  bottom: cn(
    "max-h-[85dvh] w-full rounded-t-xl border-t pb-[env(safe-area-inset-bottom,0px)]",
    "[transform:translateY(var(--drawer-swipe-movement-y))]",
    "data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]",
  ),
};

export type DrawerContentProps = Omit<
  ComponentProps<typeof DrawerPrimitive.Popup>,
  "title" | "className"
> & {
  title: string;
  description?: string;
  className?: string;
};

export function DrawerContent({
  title,
  description,
  className,
  children,
  ...props
}: DrawerContentProps) {
  const side = use(DrawerSideContext);
  const isSheet = side === "bottom";

  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop
        data-slot="drawer-overlay"
        className={cn(
          overlay.backdrop,
          // Fades out as the drawer is dragged away; tracks the finger exactly.
          "opacity-[calc(1-var(--drawer-swipe-progress,0))] data-swiping:duration-0",
        )}
      />
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className={cn("fixed inset-0 z-50 flex", viewportSide[side])}
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          data-side={side}
          className={cn(
            "relative flex flex-col overflow-y-auto overscroll-contain border-border-strong bg-surface-strong text-foreground shadow-soft outline-none touch-auto",
            "transition-transform duration-(--ds-motion-slow) ease-out",
            "data-swiping:duration-0 data-swiping:select-none",
            // A fast flick closes faster. The token keeps it 0ms under reduced motion.
            "data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--ds-motion-slow))] data-ending-style:ease-in",
            popupSide[side],
            className,
          )}
          {...props}
        >
          {isSheet ? (
            <div
              aria-hidden="true"
              className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border-strong"
            />
          ) : null}
          <DrawerPrimitive.Content className="flex flex-1 flex-col gap-5 p-6">
            <header className={cn(!isSheet && "pr-10")}>
              <DrawerPrimitive.Title className={overlay.title}>
                {title}
              </DrawerPrimitive.Title>
              {description ? (
                <DrawerPrimitive.Description className={overlay.description}>
                  {description}
                </DrawerPrimitive.Description>
              ) : null}
            </header>
            {children}
          </DrawerPrimitive.Content>
          {isSheet ? null : (
            <DrawerPrimitive.Close
              render={
                <IconButton
                  label="Close panel"
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 right-4"
                >
                  <X aria-hidden="true" />
                </IconButton>
              }
            />
          )}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

/** Action row pinned to the bottom of the panel's content. */
export function DrawerFooter({ className, ...props }: ComponentProps<"footer">) {
  return (
    <footer
      data-slot="drawer-footer"
      className={cn(overlay.footer, "mt-auto pt-2", className)}
      {...props}
    />
  );
}
