import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStates } from "../../stories/state-grid";
import { FormField } from "../field";
import { Input } from "./input";

const meta = {
  title: "Components/Input",
  component: Input,
  args: { placeholder: "AAPL", "aria-label": "Symbol" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  parameters: pseudoStates,
  render: () => (
    <div className="max-w-2xl">
      <StateGrid
        extraRows={[
          {
            id: "invalid",
            label: "Invalid",
            content: <Input aria-label="Invalid" defaultValue="-5" invalid />,
          },
          {
            id: "disabled",
            label: "Disabled",
            content: <Input aria-label="Disabled" defaultValue="AAPL" disabled />,
          },
          {
            id: "read-only",
            label: "Read only",
            content: <Input aria-label="Read only" defaultValue="AAPL" readOnly />,
          },
        ]}
      >
        {(rowId) => <Input aria-label={rowId} placeholder="AAPL" />}
      </StateGrid>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="grid max-w-xs gap-3">
      <Input aria-label="Small" size="sm" placeholder="Small" />
      <Input aria-label="Medium" size="md" placeholder="Medium" />
      <Input aria-label="Large" size="lg" placeholder="Large" />
    </div>
  ),
};

export const InFormField: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <FormField
        label="Symbol"
        description="US equities and crypto pairs are supported."
        required
      >
        <Input placeholder="AAPL" />
      </FormField>
      <FormField
        label="Target price"
        error="Enter a price greater than zero."
      >
        <Input inputMode="decimal" defaultValue="0" />
      </FormField>
      <FormField label="Account">
        <Input defaultValue="Paper #1" disabled />
      </FormField>
    </div>
  ),
};
