import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStatesFor } from "../../stories/state-grid";
import { Field, FieldDescription } from "../field";
import { Slider, SliderLabel, SliderValue } from "./slider";

const meta = {
  title: "Components/Slider",
  parameters: {
    docs: {
      description: {
        component:
          "Arrows step by `step`; Shift+arrow and PageUp/Down by `largeStep`; Home/End jump to the ends. Pass an array for a range, with a name per thumb.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  parameters: pseudoStatesFor("[data-slot=slider-thumb]"),
  render: () => (
    <div className="max-w-xl">
      <StateGrid
        extraRows={[
          {
            id: "disabled",
            label: "Disabled",
            content: <Slider defaultValue={40} disabled thumbLabels={["Disabled"]} />,
          },
        ]}
      >
        {(rowId) => <Slider defaultValue={40} thumbLabels={[rowId]} />}
      </StateGrid>
    </div>
  ),
};

export const WithLabelAndValue: Story = {
  render: () => (
    <Field className="max-w-sm">
      <Slider defaultValue={0.2} min={0} max={1} step={0.01} format={{ style: "percent" }}>
        <SliderLabel>Max drawdown</SliderLabel>
        <SliderValue />
      </Slider>
      <FieldDescription>Stop the backtest when equity falls this far from its peak.</FieldDescription>
    </Field>
  ),
};

export const Range: Story = {
  render: () => (
    <div className="max-w-sm">
      <Slider
        defaultValue={[30, 70]}
        minStepsBetweenValues={5}
        thumbLabels={["Oversold below", "Overbought above"]}
      >
        <SliderLabel>RSI bands</SliderLabel>
        <SliderValue />
      </Slider>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="h-48">
      <Slider orientation="vertical" defaultValue={60} thumbLabels={["Volume"]} />
    </div>
  ),
};
