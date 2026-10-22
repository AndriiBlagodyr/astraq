import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../badge";
import { Feedback } from "./feedback";

const meta = {
  title: "Components/Feedback & Badge",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const FeedbackTones: Story = {
  render: () => (
    <div className="grid max-w-xl gap-3">
      <Feedback title="Market data connected" tone="success" />
      <Feedback
        title="Using delayed quotes"
        description="Real-time data resumes when the provider reconnects."
      />
      <Feedback
        title="Delayed quote"
        description="The latest price is 15 minutes old."
        tone="warning"
      />
      <Feedback
        title="Order rejected"
        description="Insufficient buying power."
        tone="danger"
      />
    </div>
  ),
};

export const BadgeTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge>Draft</Badge>
      <Badge tone="brand">AAPL</Badge>
      <Badge tone="positive">+2.84%</Badge>
      <Badge tone="negative">-1.12%</Badge>
      <Badge tone="warning">Market closed</Badge>
    </div>
  ),
};
