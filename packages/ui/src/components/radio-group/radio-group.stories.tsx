import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStates } from "../../stories/state-grid";
import { Field, FieldDescription, FieldItem, FieldLabel } from "../field";
import { Fieldset, FieldsetLegend } from "../fieldset";
import { Radio, RadioGroup } from "./radio-group";

const meta = {
  title: "Components/RadioGroup",
  parameters: {
    docs: {
      description: {
        component:
          "Tab enters on the selected radio; arrow keys move and select, wrapping at the ends. Label the group with a Fieldset and each radio with a FieldItem.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Sizing({
  label,
  invalid,
  ...props
}: {
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <Field invalid={invalid}>
      <Fieldset
        render={
          <RadioGroup
            defaultValue="fixed"
            orientation="horizontal"
            {...props}
          />
        }
      >
        <FieldsetLegend className="sr-only">{label}</FieldsetLegend>
        <FieldItem>
          <Radio value="fixed" />
          <FieldLabel className="font-normal">Fixed</FieldLabel>
        </FieldItem>
        <FieldItem>
          <Radio value="percent" />
          <FieldLabel className="font-normal">% of equity</FieldLabel>
        </FieldItem>
        <FieldItem>
          <Radio value="risk" disabled />
          <FieldLabel className="font-normal">Risk-based (soon)</FieldLabel>
        </FieldItem>
      </Fieldset>
    </Field>
  );
}

export const States: Story = {
  parameters: pseudoStates,
  render: () => (
    <StateGrid
      extraRows={[
        {
          id: "invalid",
          label: "Invalid",
          content: <Sizing label="Invalid" invalid />,
        },
        {
          id: "disabled",
          label: "Disabled",
          content: <Sizing label="Disabled" disabled />,
        },
        {
          id: "read-only",
          label: "Read only",
          content: <Sizing label="Read only" readOnly />,
        },
      ]}
    >
      {(rowId) => <Sizing label={rowId} />}
    </StateGrid>
  ),
};

export const WithDescriptions: Story = {
  render: () => (
    <Field>
      <Fieldset render={<RadioGroup defaultValue="next-open" />}>
        <FieldsetLegend>Fill timing</FieldsetLegend>
        <FieldItem>
          <Radio value="close" />
          <FieldLabel className="font-normal">Same bar close</FieldLabel>
          <FieldDescription>
            Optimistic: assumes you could act on the bar that signalled.
          </FieldDescription>
        </FieldItem>
        <FieldItem>
          <Radio value="next-open" />
          <FieldLabel className="font-normal">Next bar open</FieldLabel>
          <FieldDescription>Realistic default for daily bars.</FieldDescription>
        </FieldItem>
      </Fieldset>
    </Field>
  ),
};
