import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStates } from "../../stories/state-grid";
import { FormField } from "../field";
import { Textarea } from "./textarea";

const meta = {
  title: "Components/Textarea",
  component: Textarea,
  args: { placeholder: "What should this strategy do?", "aria-label": "Notes" },
} satisfies Meta<typeof Textarea>;

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
            content: <Textarea aria-label="Invalid" defaultValue="Too short" invalid />,
          },
          {
            id: "disabled",
            label: "Disabled",
            content: <Textarea aria-label="Disabled" defaultValue="Locked while running" disabled />,
          },
          {
            id: "read-only",
            label: "Read only",
            content: <Textarea aria-label="Read only" defaultValue="Imported from v1" readOnly />,
          },
        ]}
      >
        {(rowId) => <Textarea aria-label={rowId} placeholder="Notes" />}
      </StateGrid>
    </div>
  ),
};

export const AutoResize: Story = {
  render: () => (
    <div className="max-w-md">
      <FormField
        label="Research notes"
        description="Grows with the text (CSS field-sizing; fixed height where unsupported)."
      >
        <Textarea autoResize defaultValue={"Entry: RSI < 30\nExit: RSI > 55 or 5 bars"} />
      </FormField>
    </div>
  ),
};
