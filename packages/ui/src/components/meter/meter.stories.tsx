import type { Meta, StoryObj } from "@storybook/react-vite";
import { Meter } from "./meter";

const meta = {
  title: "Components/Meter",
  component: Meter,
  args: { value: 62, label: "Buying power used", size: "md", tone: "brand" },
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
          "A measurement within a known range (`role=\"meter\"`). The caller picks `tone` from the value; the component doesn't decide what's good or bad.",
      },
    },
  },
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const currency = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const;

export const Thresholds: Story = {
  render: () => (
    <div className="grid gap-6">
      <Meter value={34} label="Portfolio in cash" />
      <Meter value={86} label="Largest position weight" tone="warning" />
      <Meter value={97} label="Margin used" tone="negative" />
      <Meter
        value={42_500}
        max={50_000}
        format={currency}
        label="Daily loss limit remaining"
        tone="positive"
      />
    </div>
  ),
};
