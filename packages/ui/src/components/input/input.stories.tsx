import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStates } from "../../stories/state-grid";
import { FormField } from "../form-field";
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

export const InFormField: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <FormField
        htmlFor="symbol"
        label="Symbol"
        hint="US equities and crypto pairs are supported."
        required
      >
        <Input placeholder="AAPL" />
      </FormField>
      <FormField
        htmlFor="price"
        label="Target price"
        error="Enter a price greater than zero."
      >
        <Input inputMode="decimal" defaultValue="0" />
      </FormField>
      <FormField htmlFor="account" label="Account">
        <Input defaultValue="Paper #1" disabled />
      </FormField>
    </div>
  ),
};
