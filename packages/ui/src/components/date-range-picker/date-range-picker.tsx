"use client";

import { useContext, type ReactNode } from "react";
import { parseDate, type DateValue } from "@internationalized/date";
import {
  Button as AriaButton,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  DateInput,
  DateRangePicker as AriaDateRangePicker,
  DateRangePickerStateContext,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Label,
  Popover,
  RangeCalendar,
  Text,
  type RangeValue,
} from "react-aria-components";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { listbox } from "../../lib/listbox";
import { popup } from "../../lib/popup";
import { Button } from "../button";
import { controlVariants, type ControlSize } from "../input";

// React Aria is the one exception to Base UI here (ADR 0002): its date
// fields handle locale order, calendars and segment-by-segment typing. It is
// wrapped so no React Aria or @internationalized/date type reaches the
// public API; dates go in and out as ISO strings.
//
// Keyboard: Tab moves between the date segments and the calendar button.
// Arrow Up/Down change a segment, typing fills it, Backspace clears it.
// Alt+ArrowDown opens the calendar; arrows move by day, Page Up/Down by
// month, Enter picks the start and then the end. Provided by React Aria.

/** Calendar dates as `YYYY-MM-DD`, with no time or time zone. */
export type DateRange = { start: string; end: string };

export type DateRangePreset = {
  label: string;
  range: DateRange;
};

export type DateRangePickerProps = {
  /** Visible label. Without one, pass `aria-label`. */
  label?: ReactNode;
  "aria-label"?: string;
  description?: ReactNode;
  /**
   * Shown while the picker is invalid. Without it, the built-in message for
   * a failed `required`, `min`, `max` or unavailable date shows.
   */
  error?: ReactNode;
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onChange?: (value: DateRange | null) => void;
  /** Earliest selectable date, `YYYY-MM-DD`. */
  min?: string;
  /** Latest selectable date, `YYYY-MM-DD`. */
  max?: string;
  /** Marks dates that can't be picked, such as market holidays. */
  isDateUnavailable?: (date: string) => boolean;
  /** Quick ranges listed beside the calendar ("Last 30 days", "YTD"). */
  presets?: DateRangePreset[];
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Marks the picker invalid, for errors from your own validation. */
  invalid?: boolean;
  /** Form field names for the two ISO dates. */
  startName?: string;
  endName?: string;
  size?: ControlSize;
  className?: string;
};

function toAria(range: DateRange | null): RangeValue<DateValue> | null {
  return range ? { start: parseDate(range.start), end: parseDate(range.end) } : null;
}

function fromAria(range: RangeValue<DateValue> | null): DateRange | null {
  return range ? { start: range.start.toString(), end: range.end.toString() } : null;
}

const segmentClassName = cn(
  "rounded-[calc(var(--ds-radius-sm)/2)] px-0.5 tabular-nums caret-transparent outline-none",
  "data-placeholder:text-muted data-[type=literal]:px-0 data-[type=literal]:text-muted",
  "data-focused:bg-brand/20 data-focused:text-foreground",
  "data-disabled:cursor-not-allowed",
);

/**
 * Two date fields and a range calendar. Type into either field or pick the
 * start and end on the calendar. Not a Base UI control: label, description
 * and error are props, not Field parts.
 */
export function DateRangePicker({
  label,
  "aria-label": ariaLabel,
  description,
  error,
  value,
  defaultValue,
  onChange,
  min,
  max,
  isDateUnavailable,
  presets,
  disabled,
  readOnly,
  required,
  invalid,
  startName,
  endName,
  size,
  className,
}: DateRangePickerProps) {
  return (
    <AriaDateRangePicker
      data-slot="date-range-picker"
      aria-label={ariaLabel}
      value={value === undefined ? undefined : toAria(value)}
      defaultValue={defaultValue === undefined ? undefined : toAria(defaultValue)}
      onChange={onChange ? (next) => onChange(fromAria(next)) : undefined}
      minValue={min ? parseDate(min) : undefined}
      maxValue={max ? parseDate(max) : undefined}
      isDateUnavailable={
        isDateUnavailable ? (date) => isDateUnavailable(date.toString()) : undefined
      }
      isDisabled={disabled}
      isReadOnly={readOnly}
      isRequired={required}
      isInvalid={invalid}
      startName={startName}
      endName={endName}
      granularity="day"
      className={cn("group/date-range grid w-full content-start gap-2", className)}
    >
      {label ? (
        // Matches FieldLabel.
        <Label
          data-slot="date-range-picker-label"
          className="w-fit text-sm font-semibold text-foreground select-none group-data-disabled/date-range:opacity-60"
        >
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-negative-fg">
              *
            </span>
          ) : null}
        </Label>
      ) : null}
      <Group
        data-slot="date-range-picker-group"
        className={cn(
          controlVariants({ size }),
          listbox.inputGroup,
          "data-readonly:bg-transparent",
          size === "sm" ? "pl-3" : "pl-inset-sm",
        )}
      >
        <DateInput slot="start" className="flex">
          {(segment) => <DateSegment segment={segment} className={segmentClassName} />}
        </DateInput>
        <span aria-hidden="true" className="px-1 text-muted">
          –
        </span>
        <DateInput slot="end" className="flex flex-1">
          {(segment) => <DateSegment segment={segment} className={segmentClassName} />}
        </DateInput>
        {/* React Aria names it ("Calendar") and links it to the label. */}
        <AriaButton
          data-slot="date-range-picker-trigger"
          className={cn(listbox.inputButton, "outline-none data-focus-visible:outline-solid")}
        >
          <CalendarDays aria-hidden="true" />
        </AriaButton>
      </Group>
      {description ? (
        // Matches FieldDescription.
        <Text slot="description" data-slot="date-range-picker-description" className="m-0 text-xs leading-5 text-muted">
          {description}
        </Text>
      ) : null}
      {/* Matches FieldError. */}
      <FieldError data-slot="date-range-picker-error" className="m-0 text-xs leading-5 font-medium text-negative-fg">
        {error}
      </FieldError>
      <Popover
        data-slot="date-range-picker-popup"
        placement="bottom start"
        offset={6}
        containerPadding={8}
        className={cn(
          popup.surface,
          "z-50 max-w-[calc(100vw-1rem)] overflow-auto p-3",
          // popup.motion, spelled with React Aria's state attributes.
          "transition-[opacity,translate] duration-(--ds-motion-base) ease-out",
          "data-entering:opacity-0 data-exiting:opacity-0",
          "data-entering:data-[placement=bottom]:-translate-y-1.5 data-entering:data-[placement=top]:translate-y-1.5",
          "data-exiting:duration-(--ds-motion-fast) data-exiting:ease-in",
        )}
      >
        <Dialog className="flex flex-col gap-3 outline-none sm:flex-row">
          {presets?.length ? <Presets presets={presets} /> : null}
          <RangeCalendar data-slot="range-calendar" className="w-fit">
            <header className="mb-2 flex items-center justify-between gap-2">
              <AriaButton slot="previous" className={cn(listbox.inputButton, "outline-none data-focus-visible:outline-solid")}>
                <ChevronLeft aria-hidden="true" />
              </AriaButton>
              <CalendarHeading className="m-0 text-sm font-semibold text-foreground" />
              <AriaButton slot="next" className={cn(listbox.inputButton, "outline-none data-focus-visible:outline-solid")}>
                <ChevronRight aria-hidden="true" />
              </AriaButton>
            </header>
            <CalendarGrid className="border-separate border-spacing-x-0 border-spacing-y-0.5">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="pb-1 text-xs font-semibold text-muted">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => <DayCell date={date} />}
              </CalendarGridBody>
            </CalendarGrid>
          </RangeCalendar>
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  );
}

function DayCell({ date }: { date: Parameters<typeof CalendarCell>[0]["date"] }) {
  return (
    <CalendarCell
      date={date}
      data-slot="calendar-cell"
      className={cn(
        "group/day size-9 cursor-pointer text-sm tabular-nums outline-none",
        // The range is one tinted band; it rounds at its ends and at week edges.
        "data-selected:bg-brand/12",
        "data-selection-start:rounded-s-md data-selection-end:rounded-e-md",
        "[td:first-child>&]:rounded-s-md [td:last-child>&]:rounded-e-md",
        "data-outside-month:hidden",
        "data-disabled:cursor-default data-disabled:text-muted data-disabled:opacity-50",
        "data-unavailable:cursor-default data-unavailable:text-muted data-unavailable:line-through",
      )}
    >
      {({ formattedDate }) => (
        <span
          className={cn(
            "flex size-full items-center justify-center rounded-md text-secondary",
            "transition-colors duration-(--ds-motion-fast)",
            "group-data-hovered/day:bg-surface-muted group-data-hovered/day:text-foreground",
            "group-data-selected/day:text-foreground",
            // Ends of the range: the solved checked fill, like a checked box.
            "group-data-selection-start/day:bg-checked group-data-selection-start/day:text-on-checked",
            "group-data-selection-end/day:bg-checked group-data-selection-end/day:text-on-checked",
            "group-data-today/day:font-bold group-data-today/day:underline group-data-today/day:underline-offset-4",
            "group-data-focus-visible/day:outline-solid group-data-focus-visible/day:outline-(length:--ds-focus-width) group-data-focus-visible/day:outline-offset-1 group-data-focus-visible/day:outline-focus-ring",
            "group-data-invalid/day:group-data-selected/day:bg-negative/15",
          )}
        >
          {formattedDate}
        </span>
      )}
    </CalendarCell>
  );
}

function Presets({ presets }: { presets: DateRangePreset[] }) {
  const state = useContext(DateRangePickerStateContext);
  const current = fromAria(state?.value?.start && state.value.end ? (state.value as RangeValue<DateValue>) : null);

  return (
    <div
      role="group"
      aria-label="Presets"
      data-slot="date-range-picker-presets"
      className="flex flex-wrap gap-1 border-border-subtle sm:w-36 sm:flex-col sm:flex-nowrap sm:border-e sm:pe-3"
    >
      {presets.map((preset) => {
        const active = current?.start === preset.range.start && current.end === preset.range.end;
        return (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            aria-pressed={active}
            className={cn("justify-start rounded-md", active && "bg-brand/12 text-foreground")}
            onClick={() => {
              state?.setValue(toAria(preset.range));
              state?.close();
            }}
          >
            {preset.label}
          </Button>
        );
      })}
    </div>
  );
}
