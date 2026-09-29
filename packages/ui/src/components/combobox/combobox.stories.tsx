import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStatesFor } from "../../stories/state-grid";
import { FormField } from "../field";
import {
  Combobox,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "./combobox";

const meta = {
  title: "Components/Combobox",
  parameters: {
    docs: {
      description: {
        component:
          "Pick from a list filtered by typing. ArrowUp/Down move, Enter selects, Escape closes (again to clear). With chips, ArrowLeft from the start of the input reaches the chips and Backspace removes one.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Symbol = { value: string; label: string };

const symbols: Symbol[] = [
  { value: "AAPL", label: "AAPL · Apple" },
  { value: "MSFT", label: "MSFT · Microsoft" },
  { value: "NVDA", label: "NVDA · NVIDIA" },
  { value: "AMZN", label: "AMZN · Amazon" },
  { value: "GOOGL", label: "GOOGL · Alphabet" },
  { value: "META", label: "META · Meta Platforms" },
  { value: "TSLA", label: "TSLA · Tesla" },
];

function SymbolCombobox(props: {
  label?: string;
  invalid?: boolean;
  disabled?: boolean;
  defaultValue?: Symbol | null;
}) {
  return (
    <Combobox
      items={symbols}
      defaultValue={props.defaultValue}
      disabled={props.disabled}
      itemToStringLabel={(item) => item.label}
    >
      <ComboboxInput
        aria-label={props.label ?? "Symbol"}
        placeholder="Search symbols"
        invalid={props.invalid}
        className="w-72"
      />
      <ComboboxContent>
        <ComboboxEmpty>No symbols match.</ComboboxEmpty>
        <ComboboxList>
          {(item: Symbol) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export const States: Story = {
  // The control surface is the input group; force states on it and the input.
  parameters: pseudoStatesFor("[data-slot=combobox-input-group], [data-slot=combobox-input]"),
  render: () => (
    <StateGrid
      extraRows={[
        { id: "invalid", label: "Invalid", content: <SymbolCombobox label="Invalid" invalid /> },
        {
          id: "disabled",
          label: "Disabled",
          content: <SymbolCombobox label="Disabled" disabled defaultValue={symbols[0]} />,
        },
      ]}
    >
      {(rowId) => <SymbolCombobox label={rowId} />}
    </StateGrid>
  ),
};

export const InField: Story = {
  render: () => (
    <div className="max-w-sm">
      <FormField label="Benchmark" description="Returns are compared against it." required>
        <SymbolCombobox />
      </FormField>
    </div>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className="max-w-md">
      <FormField label="Watchlist" description="Up to 20 symbols.">
        <Combobox
          items={symbols}
          multiple
          defaultValue={[symbols[0], symbols[2]]}
          itemToStringLabel={(item) => item.label}
        >
          <ComboboxChipsInput<Symbol> placeholder="Add symbols" chipLabel={(item) => item.value} />
          <ComboboxContent>
            <ComboboxEmpty>No symbols match.</ComboboxEmpty>
            <ComboboxList>
              {(item: Symbol) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </FormField>
    </div>
  ),
};

const grouped = [
  { value: "Equities", items: ["AAPL", "MSFT", "NVDA"] },
  { value: "ETFs", items: ["SPY", "QQQ", "IWM"] },
  { value: "Crypto", items: ["BTC-USD", "ETH-USD"] },
];

export const Grouped: Story = {
  render: () => (
    <div className="max-w-sm">
      <FormField label="Instrument">
        <Combobox items={grouped}>
          <ComboboxInput placeholder="Search instruments" size="sm" />
          <ComboboxContent>
            <ComboboxEmpty>Nothing matches.</ComboboxEmpty>
            <ComboboxList>
              {(group: (typeof grouped)[number]) => (
                <ComboboxGroup key={group.value} items={group.items}>
                  <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
                  <ComboboxCollection>
                    {(item: string) => (
                      <ComboboxItem key={item} value={item}>
                        {item}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxGroup>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </FormField>
    </div>
  ),
};
