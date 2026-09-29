import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStatesFor } from "../../stories/state-grid";
import { FormField } from "../field";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "./autocomplete";

const meta = {
  title: "Components/Autocomplete",
  parameters: {
    docs: {
      description: {
        component:
          "A text input with suggestions: the value is whatever is typed, and picking a suggestion fills it. Use Combobox when the value must be one of the options.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const indicators = [
  "SMA — Simple moving average",
  "EMA — Exponential moving average",
  "RSI — Relative strength index",
  "MACD — Moving average convergence divergence",
  "ATR — Average true range",
  "VWAP — Volume-weighted average price",
];

function IndicatorSearch(props: { label?: string; invalid?: boolean; disabled?: boolean }) {
  return (
    <Autocomplete items={indicators} disabled={props.disabled}>
      <AutocompleteInput
        aria-label={props.label ?? "Indicator"}
        placeholder="e.g. RSI(14)"
        invalid={props.invalid}
        className="w-80"
      />
      <AutocompleteContent>
        <AutocompleteEmpty>No built-in indicator matches. Custom expressions are fine.</AutocompleteEmpty>
        <AutocompleteList>
          {(item: string) => (
            <AutocompleteItem key={item} value={item}>
              {item}
            </AutocompleteItem>
          )}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}

export const States: Story = {
  parameters: pseudoStatesFor(
    "[data-slot=autocomplete-input-group], [data-slot=autocomplete-input]",
  ),
  render: () => (
    <StateGrid
      extraRows={[
        { id: "invalid", label: "Invalid", content: <IndicatorSearch label="Invalid" invalid /> },
        { id: "disabled", label: "Disabled", content: <IndicatorSearch label="Disabled" disabled /> },
      ]}
    >
      {(rowId) => <IndicatorSearch label={rowId} />}
    </StateGrid>
  ),
};

export const InField: Story = {
  render: () => (
    <div className="max-w-sm">
      <FormField label="Entry signal" description="Pick a suggestion or type an expression.">
        <IndicatorSearch />
      </FormField>
    </div>
  ),
};
