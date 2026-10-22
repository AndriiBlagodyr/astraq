import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStates } from "../../stories/state-grid";
import { FormField } from "../field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from "./select";

const meta = {
  title: "Components/Select",
  parameters: {
    docs: {
      description: {
        component:
          "Keyboard: Space, Enter, or ArrowDown opens. Arrows move, typing jumps to a match, Enter selects, Escape closes and returns focus.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const directions = {
  above: "Moves above",
  below: "Moves below",
  cross: "Crosses (soon)",
};

const intervals = {
  "1m": "1 minute",
  "5m": "5 minutes",
  "1h": "1 hour",
  "1d": "1 day",
  "1w": "1 week",
};

function DirectionSelect(props: {
  invalid?: boolean;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Select items={directions} defaultValue="above" disabled={props.disabled}>
      <SelectTrigger
        aria-label={props.label ?? "Direction"}
        invalid={props.invalid}
        size={props.size}
        className="w-56"
      />
      <SelectContent>
        <SelectItem value="above">Moves above</SelectItem>
        <SelectItem value="below">Moves below</SelectItem>
        <SelectItem value="cross" disabled>
          Crosses (soon)
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export const States: Story = {
  parameters: pseudoStates,
  render: () => (
    <StateGrid
      extraRows={[
        { id: "invalid", label: "Invalid", content: <DirectionSelect label="Invalid" invalid /> },
        { id: "disabled", label: "Disabled", content: <DirectionSelect label="Disabled" disabled /> },
      ]}
    >
      {(rowId) => <DirectionSelect label={rowId} />}
    </StateGrid>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="grid gap-3">
      <DirectionSelect label="Small" size="sm" />
      <DirectionSelect label="Medium" size="md" />
      <DirectionSelect label="Large" size="lg" />
    </div>
  ),
};

export const GroupedInField: Story = {
  render: () => (
    <div className="max-w-sm">
      <FormField label="Interval" description="Bars used for signals.">
        <Select items={intervals}>
          <SelectTrigger placeholder="Choose an interval" />
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Intraday</SelectLabel>
              <SelectItem value="1m">1 minute</SelectItem>
              <SelectItem value="5m">5 minutes</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Swing</SelectLabel>
              <SelectItem value="1d">1 day</SelectItem>
              <SelectItem value="1w">1 week</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </FormField>
    </div>
  ),
};
