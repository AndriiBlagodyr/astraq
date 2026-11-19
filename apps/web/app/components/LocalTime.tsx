"use client";

const when = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * A moment in the viewer's time zone (docs/ui-plan.md § Shared patterns:
 * events such as orders show in the user's zone). The server renders it in
 * its own zone, so the element opts out of the hydration check and React
 * keeps the browser's text.
 */
export function LocalTime({
  value,
  className,
}: {
  /** An ISO date-time. */
  value: string;
  className?: string;
}) {
  return (
    <time dateTime={value} className={className} suppressHydrationWarning>
      {when.format(new Date(value))}
    </time>
  );
}
