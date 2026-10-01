import type { ComponentProps, CSSProperties } from "react";
import { cn } from "../../lib/cn";
import { springEasing, springs, type SpringName } from "../../motion";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Computed once per preset: every AnimatedNumber shares the same few strings.
const EASINGS = Object.fromEntries(
  Object.entries(springs).map(([name, preset]) => [name, springEasing(preset)]),
) as Record<SpringName, ReturnType<typeof springEasing>>;

export type AnimatedNumberProps = Omit<ComponentProps<"span">, "children"> & {
  value: number;
  /** Passed to `Intl.NumberFormat`: currency, percent, fraction digits, compact. */
  format?: Intl.NumberFormatOptions;
  locales?: Intl.LocalesArgument;
  /** @default "snappy" */
  spring?: SpringName;
};

/**
 * A number whose digits roll to the new value. Each digit is a 0–9 strip
 * that slides with `translate` on a spring easing; tabular numerals keep
 * every column the same width, so nothing around it shifts.
 *
 * Columns are matched from the right, so the ones digit stays the ones digit
 * as the number grows. New columns appear in place, without rolling.
 *
 * Generic: it knows nothing about prices or direction. Screen readers get the
 * formatted value once; it isn't a live region, because ticking values would
 * announce constantly. Instant under reduced motion. Safe in Server
 * Components (there's no state: CSS transitions do the rolling).
 */
export function AnimatedNumber({
  value,
  format,
  locales,
  spring = "snappy",
  className,
  style,
  ...props
}: AnimatedNumberProps) {
  const formatted = new Intl.NumberFormat(locales, format).format(value);
  // Latin digits roll; everything else (separators, signs, symbols, other
  // numbering systems) renders as plain text.
  const chars = Array.from(formatted, (char) => ({ char, digit: /[0-9]/.test(char) }));
  const { easing, duration } = EASINGS[spring];

  return (
    <span
      data-slot="animated-number"
      className={cn("inline-flex whitespace-nowrap tabular-nums", className)}
      style={{ "--ds-number-easing": easing, "--ds-number-duration": duration, ...style } as CSSProperties}
      {...props}
    >
      <span className="sr-only">{formatted}</span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        {chars.map(({ char, digit }, index) => {
          // Keyed from the right, so React keeps a column across value changes.
          const key = `${digit ? "d" : char}-${chars.length - index}`;
          return digit ? (
            <DigitColumn key={key} digit={Number(char)} />
          ) : (
            <span key={key}>{char}</span>
          );
        })}
      </span>
    </span>
  );
}

function DigitColumn({ digit }: { digit: number }) {
  return (
    <span data-slot="animated-number-digit" className="relative inline-block overflow-clip">
      {/* Holds the column's width, height and baseline. */}
      <span className="invisible">{digit}</span>
      <span
        className={cn(
          "absolute inset-x-0 top-0 flex flex-col",
          "transition-[translate] duration-(--ds-number-duration) ease-(--ds-number-easing) motion-reduce:transition-none",
        )}
        // The strip is ten lines tall, so one line is 10%.
        style={{ translate: `0 ${digit * -10}%` }}
      >
        {DIGITS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </span>
    </span>
  );
}
