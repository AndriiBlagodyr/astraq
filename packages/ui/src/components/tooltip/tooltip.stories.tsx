import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info } from "lucide-react";
import { Button, IconButton } from "../button";
import { Tooltip } from "./tooltip";

const meta = {
  title: "Components/Tooltip",
  parameters: {
    docs: {
      description: {
        component:
          "Opens on hover after a short delay and immediately on keyboard focus. Escape dismisses. The trigger must be focusable.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 p-16">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Tooltip key={side} side={side} label={`Opens on the ${side}`}>
          <Button variant="secondary">{side}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};

export const OnIconButton: Story = {
  render: () => (
    <div className="p-16">
      <Tooltip label="Quotes are delayed 15 minutes on the free plan.">
        <IconButton label="About delayed data" variant="ghost">
          <Info aria-hidden="true" />
        </IconButton>
      </Tooltip>
    </div>
  ),
};
