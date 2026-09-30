import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { Spinner } from "./spinner";

const meta = {
  title: "Components/Spinner",
  component: Spinner,
  args: { size: "md", label: "Loading" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: {
    docs: {
      description: {
        component:
          "An indefinite activity indicator in the current text color. Give it a `label` when it's the only sign of loading; omit it when the parent announces busy state (e.g. `Button loading`). It keeps turning, slower, under reduced motion.",
      },
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6 text-brand-fg">
      <Spinner size="sm" label="Loading" />
      <Spinner size="md" label="Loading" />
      <Spinner size="lg" label="Loading" />
      <span className="inline-flex items-center gap-2 text-sm text-secondary">
        <Spinner size="sm" />
        Syncing quotes…
      </span>
      <Button loading>Place order</Button>
    </div>
  ),
};
