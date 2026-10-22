import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { springEasing, springs, type SpringName } from "../../motion";
import { Button } from "../button";
import { AnimatedNumber } from "./animated-number";

const meta = {
  title: "Components/AnimatedNumber",
  component: AnimatedNumber,
  args: {
    value: 18432.57,
    format: { style: "currency", currency: "USD" },
    spring: "snappy",
    className: "font-display text-4xl font-bold",
  },
  argTypes: {
    spring: { control: "inline-radio", options: Object.keys(springs) },
    value: { control: { type: "number", step: 0.01 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Digits roll to the new value on a spring easing, with tabular numerals so the width stays put. Generic: no market semantics. Screen readers get the formatted value; it isn't a live region. Instant under reduced motion.",
      },
    },
  },
} satisfies Meta<typeof AnimatedNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function useTicker(initial: number, step: number) {
  const [value, setValue] = useState(initial);
  const nudge = () => setValue((current) => current + (Math.random() - 0.45) * step);
  return [value, nudge] as const;
}

export const Formats: Story = {
  render: function Render() {
    const [value, nudge] = useTicker(18432.57, 400);
    return (
      <div className="grid gap-5">
        <dl className="m-0 grid grid-cols-[10rem_1fr] items-baseline gap-x-6 gap-y-3 text-2xl font-semibold">
          <dt className="text-sm font-normal text-secondary">Currency</dt>
          <dd className="m-0">
            <AnimatedNumber value={value} format={{ style: "currency", currency: "USD" }} />
          </dd>
          <dt className="text-sm font-normal text-secondary">Percent, signed</dt>
          <dd className="m-0">
            <AnimatedNumber
              value={(value - 18000) / 18000}
              format={{ style: "percent", minimumFractionDigits: 2, signDisplay: "exceptZero" }}
            />
          </dd>
          <dt className="text-sm font-normal text-secondary">Compact</dt>
          <dd className="m-0">
            <AnimatedNumber value={value * 1000} format={{ notation: "compact", maximumFractionDigits: 1 }} />
          </dd>
          <dt className="text-sm font-normal text-secondary">de-DE</dt>
          <dd className="m-0">
            <AnimatedNumber value={value} locales="de-DE" format={{ style: "currency", currency: "EUR" }} />
          </dd>
        </dl>
        <Button className="w-fit" variant="secondary" onClick={nudge}>
          Tick
        </Button>
      </div>
    );
  },
};

export const Springs: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The presets are plain objects for the `motion` library (`transition={springs.snappy}`). `springEasing` samples one into a CSS `linear()` easing, which is what AnimatedNumber uses. The curve below is that easing.",
      },
    },
  },
  render: function Render() {
    const [value, setValue] = useState(1200);
    const names = Object.keys(springs) as SpringName[];
    return (
      <div className="grid gap-6">
        <div className="grid w-fit grid-cols-[9rem_12rem_auto] items-center gap-x-6 gap-y-4">
          {names.map((name) => {
            const { points, duration } = springEasing(springs[name]);
            const path = points
              .map((y, index) => `${(index / (points.length - 1)) * 120},${50 - y * 40}`)
              .join(" ");
            return (
              <div key={name} className="contents">
                <div>
                  <p className="m-0 text-sm font-semibold text-foreground">{name}</p>
                  <p className="m-0 text-xs text-muted tabular-nums">settles in {duration}</p>
                </div>
                <AnimatedNumber className="text-3xl font-bold" value={value} spring={name} />
                <svg viewBox="0 0 120 56" className="h-14 w-30" aria-hidden="true">
                  <line x1="0" x2="120" y1="10" y2="10" className="stroke-chart-grid" strokeDasharray="2 3" />
                  <polyline points={path} fill="none" className="stroke-chart-1" strokeWidth="2" />
                </svg>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setValue((v) => v + 7358)}>
            Up
          </Button>
          <Button variant="secondary" onClick={() => setValue((v) => Math.max(0, v - 4921))}>
            Down
          </Button>
        </div>
      </div>
    );
  },
};
