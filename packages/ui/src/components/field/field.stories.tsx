import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "../checkbox";
import { Input } from "../input";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { FormField } from "./form-field";

const meta = {
  title: "Components/Field",
  parameters: {
    docs: {
      description: {
        component:
          "Field links a label, a control, its description, and its error: ids, `aria-describedby`, and `aria-invalid` are wired by Base UI for every control in the package. `FormField` is the one-element shorthand; the parts compose when you need a different layout.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shorthand: Story = {
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
        description="Alerts fire once per session."
        error="Enter a price greater than zero."
      >
        <Input inputMode="decimal" defaultValue="0" />
      </FormField>
      <FormField label="Account" disabled>
        <Input defaultValue="Paper #1" />
      </FormField>
    </div>
  ),
};

export const Parts: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The same wiring, composed by hand. `FieldError` with no children shows the browser's message when a constraint fails; blur the empty field to see it (`validationMode=\"onBlur\"`).",
      },
    },
  },
  render: () => (
    <div className="grid max-w-md gap-6">
      <Field required validationMode="onBlur">
        <div className="flex items-baseline justify-between">
          <FieldLabel>Strategy name</FieldLabel>
          <span className="text-xs text-muted">3–40 characters</span>
        </div>
        <Input minLength={3} maxLength={40} placeholder="Mean reversion v2" />
        <FieldError match="valueMissing">Give the strategy a name.</FieldError>
        <FieldError match="tooShort">Use at least 3 characters.</FieldError>
      </Field>
      <Field>
        <FieldLabel className="flex items-center gap-3 font-normal">
          <Checkbox defaultChecked />
          Email me when a backtest finishes
        </FieldLabel>
        <FieldDescription className="pl-8">
          Sent to the address on your profile.
        </FieldDescription>
      </Field>
    </div>
  ),
};
