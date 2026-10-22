import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "./separator";

const meta = {
  title: "Components/Separator",
  component: Separator,
  parameters: {
    docs: {
      description: {
        component:
          "A hairline between groups (`role=\"separator\"`). Vertical separators stretch to their flex row.",
      },
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="grid max-w-sm gap-3 text-sm">
      <p className="m-0 font-semibold text-foreground">Momentum, 20/50 SMA</p>
      <Separator {...args} />
      <p className="m-0 text-secondary">Enter on a golden cross, exit on the reverse.</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center gap-3 text-sm text-secondary">
      <span>Daily</span>
      <Separator orientation="vertical" />
      <span>2019–2024</span>
      <Separator orientation="vertical" />
      <span>S&amp;P 500</span>
    </div>
  ),
};
