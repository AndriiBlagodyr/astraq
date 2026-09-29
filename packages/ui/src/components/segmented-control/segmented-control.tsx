"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

/*
 * Hand-built on purpose (ADR 0002 §6): the WAI-ARIA radio group pattern.
 * Production alternative: Base UI RadioGroup or ToggleGroup.
 *
 * - One tab stop (roving tabindex): Tab lands on the checked segment, or the
 *   first enabled one when nothing is checked, and Tab again leaves.
 * - Arrow keys move focus AND check, wrapping and skipping disabled
 *   segments; Left/Right flip in RTL. Home/End jump to the ends. Space
 *   checks the focused segment.
 * - Exactly one value, never none once chosen: pressing the checked segment
 *   does nothing. For something that can be switched off, use ToggleGroup.
 *
 * Segments are equal width, so the indicator slides with `translate` alone
 * and never animates its width (motion rule 4).
 *
 * Not a Base UI control: name it with `aria-label` / `aria-labelledby` (a
 * FieldLabel can't point at it), and it submits through `name` in native
 * FormData, so Form's `onFormSubmit` object doesn't include it.
 */

const ITEM_SELECTOR = '[data-slot="segmented-control-item"]';

type SegmentedContextValue = {
  value: string | null;
  tabStop: string | null;
  disabled: boolean;
  select: (value: string) => void;
};

const SegmentedContext = createContext<SegmentedContextValue | null>(null);

function useSegmented() {
  const context = useContext(SegmentedContext);
  if (!context) {
    throw new Error("SegmentedControlItem must be used inside SegmentedControl");
  }
  return context;
}

const segmentedVariants = cva(
  "relative isolate inline-grid auto-cols-fr grid-flow-col rounded-pill border border-border bg-surface-muted p-1",
  {
    variants: {
      size: {
        sm: "min-h-control-sm text-xs",
        md: "min-h-control-md text-sm",
        lg: "min-h-control-lg text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type Layout = { index: number; count: number; rtl: boolean; animate: boolean };

export type SegmentedControlProps = Omit<
  ComponentProps<"div">,
  "defaultValue" | "onChange"
> &
  VariantProps<typeof segmentedVariants> & {
    value?: string | null;
    defaultValue?: string | null;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    /** Submits the value with a form, via a hidden input. */
    name?: string;
  };

export function SegmentedControl({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  disabled = false,
  name,
  size,
  className,
  children,
  onKeyDown,
  ...props
}: SegmentedControlProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp !== undefined ? valueProp : uncontrolled;
  const rootRef = useRef<HTMLDivElement>(null);
  const measured = useRef(false);
  const [layout, setLayout] = useState<Layout>({ index: -1, count: 0, rtl: false, animate: false });
  const [tabStop, setTabStop] = useState<string | null>(value);

  const select = useCallback(
    (next: string) => {
      if (disabled || next === value) return;
      if (valueProp === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [disabled, value, valueProp, onValueChange],
  );

  // The DOM is the source of order: it knows which segments exist, which are
  // disabled, and where the checked one sits, without items registering.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR)];
    const index = items.findIndex((item) => item.dataset.value === value);
    const checkedEnabled = index >= 0 && !items[index].disabled;
    const firstEnabled = items.find((item) => !item.disabled)?.dataset.value ?? null;
    const next: Layout = {
      index,
      count: items.length,
      rtl: getComputedStyle(root).direction === "rtl",
      // Slide only between values, never on first paint.
      animate: measured.current,
    };
    measured.current = true;
    setTabStop(checkedEnabled ? (value as string) : firstEnabled);
    setLayout((prev) =>
      prev.index === next.index &&
      prev.count === next.count &&
      prev.rtl === next.rtl &&
      prev.animate === next.animate
        ? prev
        : next,
    );
    // Children cover segments being added, removed, or disabled.
  }, [value, children]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;

    const items = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR),
    ].filter((item) => !item.disabled);
    const current = items.indexOf(event.target as HTMLButtonElement);
    if (current === -1 || items.length === 0) return;

    const forward = layout.rtl ? "ArrowLeft" : "ArrowRight";
    const backward = layout.rtl ? "ArrowRight" : "ArrowLeft";
    let target: number;
    switch (event.key) {
      case forward:
      case "ArrowDown":
        target = (current + 1) % items.length;
        break;
      case backward:
      case "ArrowUp":
        target = (current - 1 + items.length) % items.length;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = items.length - 1;
        break;
      case " ":
        target = current;
        break;
      default:
        return;
    }
    event.preventDefault();
    const item = items[target];
    item.focus();
    if (item.dataset.value) select(item.dataset.value);
  }

  const indicatorStyle: CSSProperties = {
    // Padding is 0.25rem per side; every segment gets an equal share.
    width: `calc((100% - 0.5rem) / ${Math.max(layout.count, 1)})`,
    translate: `${(layout.rtl ? -1 : 1) * layout.index * 100}% 0`,
  };

  return (
    <SegmentedContext.Provider value={{ value, tabStop, disabled, select }}>
      <div
        ref={rootRef}
        role="radiogroup"
        data-slot="segmented-control"
        aria-disabled={disabled || undefined}
        data-disabled={disabled || undefined}
        className={cn(
          segmentedVariants({ size }),
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span
          aria-hidden="true"
          data-slot="segmented-control-indicator"
          className={cn(
            "pointer-events-none absolute inset-y-1 start-1 -z-10 rounded-pill border border-checked bg-brand/12 shadow-sm",
            layout.index < 0 && "hidden",
            layout.animate && "transition-[translate] duration-(--ds-motion-base) ease-out",
          )}
          style={indicatorStyle}
        />
        {children}
        {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      </div>
    </SegmentedContext.Provider>
  );
}

export type SegmentedControlItemProps = Omit<ComponentProps<"button">, "value"> & {
  value: string;
};

export function SegmentedControlItem({
  value,
  disabled: disabledProp = false,
  className,
  onClick,
  ...props
}: SegmentedControlItemProps) {
  const group = useSegmented();
  const checked = group.value === value;
  const disabled = group.disabled || disabledProp;

  return (
    <button
      type="button"
      role="radio"
      data-slot="segmented-control-item"
      data-value={value}
      data-checked={checked || undefined}
      aria-checked={checked}
      disabled={disabled}
      tabIndex={group.tabStop === value ? 0 : -1}
      className={cn(
        "inline-flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-pill px-3 font-semibold whitespace-nowrap text-muted select-none",
        "transition-[color,scale] duration-(--ds-motion-fast) ease-out",
        "hover:text-foreground motion-safe:active:scale-[0.97]",
        "data-checked:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-muted",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) group.select(value);
      }}
      {...props}
    />
  );
}
