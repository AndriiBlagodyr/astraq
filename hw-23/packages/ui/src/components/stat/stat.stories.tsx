import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AnimatedNumber } from "../animated-number";
import { Button } from "../button";
import { Card } from "../card";
import { Stat } from "./stat";

const meta = {
  title: "Components/Stat",
  component: Stat,
  args: {
    label: "Total return",
    value: "$18,432.57",
    delta: "+12.4%",
    trend: "up",
    tone: "positive",
    description: "since Jan 2024",
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    trend: { control: "inline-radio", options: [undefined, "up", "down", "flat"] },
    tone: { control: "inline-radio", options: ["neutral", "positive", "negative", "warning"] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A labelled figure with an optional change. `trend` sets the arrow and `tone` the color, separately: the component doesn't know whether up is good. The arrow is decorative, so keep the sign in the delta text.",
      },
    },
  },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-4">
      <Card className="p-5">
        <Stat label="Win rate" value="58.2%" delta="+3.1 pts" trend="up" tone="positive" />
      </Card>
      <Card className="p-5">
        <Stat
          label="Max drawdown"
          value="-8.4%"
          delta="-2.0 pts"
          trend="down"
          tone="positive"
          description="Down is good here"
        />
      </Card>
      <Card className="p-5">
        <Stat label="Sharpe" value="1.34" delta="0.00" trend="flat" />
      </Card>
      <Card className="p-5">
        <Stat label="API quota" value="91%" delta="+14%" trend="up" tone="warning" />
      </Card>
      <Card className="p-5">
        <Stat size="sm" label="Jobs run" value="1,204" />
      </Card>
      <Card className="p-5">
        <Stat size="lg" label="Equity" value="$104k" delta="-1.2%" trend="down" tone="negative" />
      </Card>
    </div>
  ),
};

export const Animated: Story = {
  render: function Render() {
    const [equity, setEquity] = useState(104_218.4);
    const change = (equity - 100_000) / 100_000;
    return (
      <div className="grid gap-4">
        <Card className="w-72 p-5">
          <Stat
            label="Equity"
            value={<AnimatedNumber value={equity} format={{ style: "currency", currency: "USD" }} />}
            delta={
              <AnimatedNumber
                value={change}
                format={{ style: "percent", minimumFractionDigits: 2, signDisplay: "exceptZero" }}
              />
            }
            trend={change > 0 ? "up" : change < 0 ? "down" : "flat"}
            tone={change > 0 ? "positive" : change < 0 ? "negative" : "neutral"}
          />
        </Card>
        <Button
          className="w-fit"
          variant="secondary"
          onClick={() => setEquity((value) => value + (Math.random() - 0.5) * 6000)}
        >
          Tick
        </Button>
      </div>
    );
  },
};
