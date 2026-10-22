import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStatesFor } from "../../stories/state-grid";
import { FormField } from "../field";
import { NumberField } from "./number-field";

const meta = {
  title: "Components/NumberField",
  component: NumberField,
  args: { "aria-label": "Quantity", defaultValue: 10, min: 1, className: "w-48" },
  parameters: {
    docs: {
      description: {
        component:
          "ArrowUp/Down step by `step`, Shift by `largeStep`, Alt by `smallStep`; Home/End jump to min/max. `format` takes Intl.NumberFormat options. The value is a JS number: convert money to Decimal at the boundary.",
      },
    },
  },
} satisfies Meta<typeof NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  parameters: pseudoStatesFor("[data-slot=number-field] [role=group], [data-slot=number-field-input]"),
  render: () => (
    <StateGrid
      extraRows={[
        {
          id: "invalid",
          label: "Invalid",
          content: <NumberField aria-label="Invalid" defaultValue={0} invalid className="w-48" />,
        },
        {
          id: "disabled",
          label: "Disabled",
          content: <NumberField aria-label="Disabled" defaultValue={10} disabled className="w-48" />,
        },
        {
          id: "read-only",
          label: "Read only",
          content: <NumberField aria-label="Read only" defaultValue={10} readOnly className="w-48" />,
        },
      ]}
    >
      {(rowId) => <NumberField aria-label={rowId} defaultValue={10} className="w-48" />}
    </StateGrid>
  ),
};

export const Formats: Story = {
  render: () => (
    <div className="grid max-w-sm gap-6">
      <FormField label="Limit price" description="Currency, two decimals, steps of 0.05.">
        <NumberField
          defaultValue={189.45}
          min={0}
          step={0.05}
          format={{ style: "currency", currency: "USD" }}
        />
      </FormField>
      <FormField label="Position size" description="Percent of equity, 0–100%.">
        <NumberField
          defaultValue={0.05}
          min={0}
          max={1}
          step={0.01}
          format={{ style: "percent", maximumFractionDigits: 1 }}
        />
      </FormField>
      <FormField label="Lookback (bars)">
        <NumberField defaultValue={20} min={2} max={500} hideSteppers />
      </FormField>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="grid w-48 gap-3">
      <NumberField aria-label="Small" size="sm" defaultValue={1} />
      <NumberField aria-label="Medium" size="md" defaultValue={1} />
      <NumberField aria-label="Large" size="lg" defaultValue={1} />
    </div>
  ),
};
