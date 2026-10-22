import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStates } from "../../stories/state-grid";
import { CheckboxGroup } from "../checkbox-group";
import { Field, FieldDescription, FieldItem, FieldLabel } from "../field";
import { Fieldset, FieldsetLegend } from "../fieldset";
import { Checkbox } from "./checkbox";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  args: { "aria-label": "Include extended hours" },
  parameters: {
    docs: {
      description: {
        component:
          "Space toggles. The unchecked edge (`border-control`) and checked fill (`bg-checked`) are solved to 3:1 on every surface in every theme.",
      },
    },
  },
} satisfies Meta<typeof Checkbox>;

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
              <Checkbox aria-label="Invalid" />
            </Field>
          ),
        },
        {
          id: "disabled",
          label: "Disabled",
          content: (
            <>
              <Checkbox aria-label="Disabled" disabled />
              <Checkbox aria-label="Disabled checked" disabled defaultChecked />
            </>
          ),
        },
        {
          id: "read-only",
          label: "Read only",
          content: <Checkbox aria-label="Read only" readOnly defaultChecked />,
        },
      ]}
    >
      {(rowId) => (
        <>
          <Checkbox aria-label={`${rowId} unchecked`} />
          <Checkbox aria-label={`${rowId} checked`} defaultChecked />
          <Checkbox aria-label={`${rowId} mixed`} indeterminate />
        </>
      )}
    </StateGrid>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <label className="flex w-fit items-center gap-3 text-sm text-foreground">
      <Checkbox defaultChecked />
      Include extended hours
    </label>
  ),
};

const sessions = ["pre", "regular", "post"];

export const GroupWithParent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A CheckboxGroup labelled by a Fieldset, with a parent box that reads mixed when some are ticked. Each option is a FieldItem, so its description is linked to it.",
      },
    },
  },
  render: function Render() {
    const [value, setValue] = useState(["regular"]);
    return (
      <Field>
        <Fieldset
          render={
            <CheckboxGroup
              value={value}
              onValueChange={setValue}
              allValues={sessions}
            />
          }
        >
          <FieldsetLegend>Sessions</FieldsetLegend>
          <label className="flex w-fit items-center gap-3 text-sm font-semibold text-foreground">
            <Checkbox parent />
            All sessions
          </label>
          <div className="grid gap-3 pl-8">
            <FieldItem>
              <Checkbox value="pre" />
              <FieldLabel className="font-normal">Pre-market</FieldLabel>
              <FieldDescription>04:00–09:30 ET</FieldDescription>
            </FieldItem>
            <FieldItem>
              <Checkbox value="regular" />
              <FieldLabel className="font-normal">Regular</FieldLabel>
              <FieldDescription>09:30–16:00 ET</FieldDescription>
            </FieldItem>
            <FieldItem>
              <Checkbox value="post" />
              <FieldLabel className="font-normal">After hours</FieldLabel>
              <FieldDescription>16:00–20:00 ET</FieldDescription>
            </FieldItem>
          </div>
        </Fieldset>
      </Field>
    );
  },
};
