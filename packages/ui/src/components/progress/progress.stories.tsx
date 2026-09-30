import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "./progress";

const meta = {
  title: "Components/Progress",
  component: Progress,
  args: { value: 40, label: "Backtest", showValue: true, size: "md", tone: "brand" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    tone: { control: "inline-radio", options: ["brand", "positive", "warning", "negative"] },
    value: { control: { type: "range", min: 0, max: 100 } },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "How far a task has got (`role=\"progressbar\"`). `value={null}` is indeterminate: the bar sweeps, slower under reduced motion. For a static measurement, use Meter.",
      },
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Indeterminate: Story = {
  args: { value: null, label: "Loading candles", showValue: false },
};

export const Variants: Story = {
  render: () => (
    <div className="grid gap-6">
      <Progress value={72} label="Importing AAPL history" showValue size="lg" />
      <Progress value={100} label="Backtest complete" showValue tone="positive" />
      <Progress value={55} label="Rate limit used" showValue tone="warning" />
      <Progress value={30} label="Retrying provider" showValue tone="negative" />
      <Progress value={64} aria-label="Upload" size="sm" />
    </div>
  ),
};
