import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChartCandlestick, ChartLine, ChartNoAxesColumn } from "lucide-react";
import { StateGrid, pseudoStatesFor } from "../../stories/state-grid";
import { SegmentedControl, SegmentedControlItem } from "./segmented-control";

const meta = {
  title: "Components/SegmentedControl",
  parameters: {
    docs: {
      description: {
        component:
          "Hand-built WAI-ARIA radio group (ADR 0002 §6). One tab stop; arrow keys move and select, wrapping and skipping disabled segments (Left/Right flip in RTL); Home/End jump to the ends. Exactly one value: for something that can be switched off, use ToggleGroup.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const timeframes = ["1D", "1W", "1M", "3M", "1Y", "All"];

function Timeframes({ label, ...props }: { label: string; disabled?: boolean; size?: "sm" | "md" | "lg" }) {
  return (
    <SegmentedControl aria-label={label} defaultValue="1M" {...props}>
      {timeframes.map((tf) => (
        <SegmentedControlItem key={tf} value={tf} disabled={tf === "All"}>
          {tf}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

export const States: Story = {
  parameters: pseudoStatesFor("[data-slot=segmented-control-item]:nth-child(3)"),
  render: () => (
    <StateGrid
      extraRows={[
        { id: "disabled", label: "Disabled", content: <Timeframes label="Disabled" disabled /> },
      ]}
    >
      {(rowId) => <Timeframes label={rowId} />}
    </StateGrid>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="grid justify-items-start gap-3">
      <Timeframes label="Small" size="sm" />
      <Timeframes label="Medium" size="md" />
      <Timeframes label="Large" size="lg" />
    </div>
  ),
};

export const Controlled: Story = {
  render: function Render() {
    const [chart, setChart] = useState("candles");
    return (
      <div className="grid justify-items-start gap-3">
        <SegmentedControl aria-label="Chart type" value={chart} onValueChange={setChart}>
          <SegmentedControlItem value="candles">
            <ChartCandlestick aria-hidden="true" />
            Candles
          </SegmentedControlItem>
          <SegmentedControlItem value="line">
            <ChartLine aria-hidden="true" />
            Line
          </SegmentedControlItem>
          <SegmentedControlItem value="volume">
            <ChartNoAxesColumn aria-hidden="true" />
            Volume
          </SegmentedControlItem>
        </SegmentedControl>
        <p className="m-0 text-sm text-secondary">
          Showing: <span className="font-semibold text-foreground">{chart}</span>
        </p>
      </div>
    );
  },
};

export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <Timeframes label="Right to left" />
    </div>
  ),
};
