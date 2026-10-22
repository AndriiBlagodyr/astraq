import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { getLocalTimeZone, isWeekend, parseDate, startOfYear, today } from "@internationalized/date";
import { StateGrid, pseudoStatesFor } from "../../stories/state-grid";
import { Button } from "../button";
import { DateRangePicker, type DateRange, type DateRangePreset } from "./date-range-picker";

const meta = {
  title: "Components/DateRangePicker",
  component: DateRangePicker,
  args: {
    label: "Backtest window",
    defaultValue: { start: "2026-03-02", end: "2026-06-30" },
    className: "max-w-xs",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Two date fields and a range calendar, built on React Aria (the ADR's one exception to Base UI) and wrapped so dates go in and out as `YYYY-MM-DD` strings. Type into the segments (ArrowUp/Down change them) or press Alt+ArrowDown to open the calendar, then pick the start and the end. Segment order and month names follow the browser locale.",
      },
    },
  },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  parameters: pseudoStatesFor("[data-slot=date-range-picker-group]"),
  render: () => (
    <StateGrid
      extraRows={[
        {
          id: "invalid",
          label: "Invalid",
          content: (
            <DateRangePicker
              aria-label="Invalid"
              defaultValue={{ start: "2026-03-02", end: "2026-06-30" }}
              invalid
              error="The window must cover at least 200 trading days."
              className="max-w-xs"
            />
          ),
        },
        {
          id: "disabled",
          label: "Disabled",
          content: (
            <DateRangePicker
              aria-label="Disabled"
              defaultValue={{ start: "2026-03-02", end: "2026-06-30" }}
              disabled
              className="max-w-xs"
            />
          ),
        },
        {
          id: "read-only",
          label: "Read only",
          content: (
            <DateRangePicker
              aria-label="Read only"
              defaultValue={{ start: "2026-03-02", end: "2026-06-30" }}
              readOnly
              className="max-w-xs"
            />
          ),
        },
        {
          id: "empty",
          label: "Empty",
          content: <DateRangePicker aria-label="Empty" className="max-w-xs" />,
        },
      ]}
    >
      {(rowId) => (
        <DateRangePicker
          aria-label={rowId}
          defaultValue={{ start: "2026-03-02", end: "2026-06-30" }}
          className="max-w-xs"
        />
      )}
    </StateGrid>
  ),
};

function iso(date: { toString(): string }) {
  return date.toString();
}

function presetsFromToday(): DateRangePreset[] {
  const now = today(getLocalTimeZone());
  return [
    { label: "Last 7 days", range: { start: iso(now.subtract({ days: 6 })), end: iso(now) } },
    { label: "Last 30 days", range: { start: iso(now.subtract({ days: 29 })), end: iso(now) } },
    { label: "Last 90 days", range: { start: iso(now.subtract({ days: 89 })), end: iso(now) } },
    { label: "Year to date", range: { start: iso(startOfYear(now)), end: iso(now) } },
    { label: "Last 12 months", range: { start: iso(now.subtract({ years: 1 }).add({ days: 1 })), end: iso(now) } },
  ];
}

export const WithPresets: Story = {
  render: function Render() {
    const [presets] = useState(presetsFromToday);
    const [value, setValue] = useState<DateRange | null>(presets[1]!.range);
    return (
      <div className="grid max-w-xs gap-3">
        <DateRangePicker
          label="Performance period"
          description="Pick a preset or any two dates."
          presets={presets}
          value={value}
          onChange={setValue}
        />
        <p className="m-0 font-mono text-xs text-secondary">{JSON.stringify(value)}</p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Presets sit beside the calendar and close it when picked. The active preset is `aria-pressed`. Controlled: the value below is what `onChange` returns.",
      },
    },
  },
};

export const Constraints: Story = {
  render: () => (
    <form
      className="grid max-w-xs gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        window.alert(JSON.stringify(data));
      }}
    >
      <DateRangePicker
        label="Trading days"
        description="2026 only. Weekends can't be picked."
        min="2026-01-01"
        max="2026-12-31"
        isDateUnavailable={(date) => isWeekend(parseDate(date), "en-US")}
        required
        startName="from"
        endName="to"
      />
      <Button type="submit" className="justify-self-start">
        Run backtest
      </Button>
    </form>
  ),
  parameters: {
    docs: {
      description: {
        story: "`min`, `max` and `isDateUnavailable` limit the calendar and validate typed dates. Submit empty to see the `required` message; a valid range submits `from` and `to` as ISO dates.",
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="grid max-w-xs gap-4">
      {(["sm", "md", "lg"] as const).map((size) => (
        <DateRangePicker
          key={size}
          label={`Size ${size}`}
          size={size}
          defaultValue={{ start: "2026-03-02", end: "2026-06-30" }}
        />
      ))}
    </div>
  ),
};
