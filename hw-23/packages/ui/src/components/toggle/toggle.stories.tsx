import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlignJustify, Bold, ChartCandlestick, ChartLine, Grid3x3, Italic } from "lucide-react";
import { StateGrid, pseudoStates } from "../../stories/state-grid";
import { ToggleGroup } from "../toggle-group";
import { Toggle } from "./toggle";

const meta = {
  title: "Components/Toggle",
  component: Toggle,
  args: { children: "Log scale", variant: "ghost", size: "md" },
  argTypes: {
    variant: { control: "inline-radio", options: ["ghost", "outline"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A button that stays pressed (`aria-pressed`). Pressed shows by a solved `bg-checked` edge as well as a tint, so the state clears 3:1.",
      },
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const variants = ["ghost", "outline"] as const;

export const States: Story = {
  parameters: pseudoStates,
  render: () => (
    <StateGrid
      extraRows={[
        {
          id: "pressed",
          label: "Pressed",
          content: variants.map((variant) => (
            <Toggle key={variant} variant={variant} defaultPressed>
              {variant}
            </Toggle>
          )),
        },
        {
          id: "disabled",
          label: "Disabled",
          content: variants.map((variant) => (
            <Toggle key={variant} variant={variant} disabled>
              {variant}
            </Toggle>
          )),
        },
      ]}
    >
      {() =>
        variants.map((variant) => (
          <Toggle key={variant} variant={variant}>
            {variant}
          </Toggle>
        ))
      }
    </StateGrid>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle aria-label="Show grid" size="sm" defaultPressed>
        <Grid3x3 aria-hidden="true" />
      </Toggle>
      <Toggle aria-label="Show grid" variant="outline">
        <Grid3x3 aria-hidden="true" />
      </Toggle>
      <Toggle aria-label="Show grid" size="lg">
        <Grid3x3 aria-hidden="true" />
      </Toggle>
    </div>
  ),
};

export const Group: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Single (default): pressing one releases the others, and pressing it again releases it. `multiple` lets several stay pressed. Arrow keys move between toggles.",
      },
    },
  },
  render: () => (
    <div className="grid gap-4">
      <ToggleGroup aria-label="Chart type" defaultValue={["candles"]}>
        <Toggle value="candles" aria-label="Candles">
          <ChartCandlestick aria-hidden="true" />
        </Toggle>
        <Toggle value="line" aria-label="Line">
          <ChartLine aria-hidden="true" />
        </Toggle>
      </ToggleGroup>
      <ToggleGroup aria-label="Text style" multiple defaultValue={["bold"]}>
        <Toggle value="bold" aria-label="Bold" variant="outline" size="sm">
          <Bold aria-hidden="true" />
        </Toggle>
        <Toggle value="italic" aria-label="Italic" variant="outline" size="sm">
          <Italic aria-hidden="true" />
        </Toggle>
        <Toggle value="justify" aria-label="Justify" variant="outline" size="sm">
          <AlignJustify aria-hidden="true" />
        </Toggle>
      </ToggleGroup>
    </div>
  ),
};
