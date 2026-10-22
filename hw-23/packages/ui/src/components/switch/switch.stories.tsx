import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStates } from "../../stories/state-grid";
import { Field, FieldDescription, FieldLabel } from "../field";
import { Switch } from "./switch";

const meta = {
  title: "Components/Switch",
  component: Switch,
  args: { "aria-label": "Live data" },
  parameters: {
    docs: {
      description: {
        component:
          "An on/off setting that applies immediately; Space toggles. For a choice submitted with a form, use Checkbox.",
      },
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  parameters: pseudoStates,
  render: () => (
    <StateGrid
      extraRows={[
        {
          id: "invalid",
          label: "Invalid",
          content: (
            <Field invalid>
              <Switch aria-label="Invalid" />
            </Field>
          ),
        },
        {
          id: "disabled",
          label: "Disabled",
          content: (
            <>
              <Switch aria-label="Disabled off" disabled />
              <Switch aria-label="Disabled on" disabled defaultChecked />
            </>
          ),
        },
        {
          id: "read-only",
          label: "Read only",
          content: <Switch aria-label="Read only" readOnly defaultChecked />,
        },
      ]}
    >
      {(rowId) => (
        <>
          <Switch aria-label={`${rowId} off`} />
          <Switch aria-label={`${rowId} on`} defaultChecked />
        </>
      )}
    </StateGrid>
  ),
};

export const InField: Story = {
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel className="flex items-center justify-between gap-6">
        Stream live quotes
        <Switch defaultChecked />
      </FieldLabel>
      <FieldDescription>Off falls back to 15-minute delayed data.</FieldDescription>
    </Field>
  ),
};
