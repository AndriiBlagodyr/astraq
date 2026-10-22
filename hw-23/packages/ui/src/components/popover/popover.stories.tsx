import type { Meta, StoryObj } from "@storybook/react-vite";
import { SlidersHorizontal } from "lucide-react";
import { Button, IconButton } from "../button";
import { Field, FieldLabel } from "../field";
import { Input } from "../input";
import { Switch } from "../switch";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

const meta = {
  title: "Components/Popover",
  parameters: {
    docs: {
      description: {
        component:
          "Interactive content anchored to a trigger. Focus moves in on open; Tab moves through the content; Escape or an outside click closes and returns focus to the trigger.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="secondary" />}>
        <SlidersHorizontal aria-hidden="true" />
        Chart settings
      </PopoverTrigger>
      <PopoverContent className="grid gap-4">
        <div>
          <PopoverTitle>Chart settings</PopoverTitle>
          <PopoverDescription>Applies to every chart on this page.</PopoverDescription>
        </div>
        <Field>
          <FieldLabel>Moving average length</FieldLabel>
          <Input defaultValue="50" inputMode="numeric" />
        </Field>
        <label className="flex items-center justify-between gap-3 text-sm text-secondary">
          Log scale
          <Switch defaultChecked />
        </label>
        <div className="flex justify-end gap-2">
          <PopoverClose render={<Button variant="ghost" size="sm" />}>Cancel</PopoverClose>
          <PopoverClose render={<Button size="sm" />}>Apply</PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const WithArrow: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Popover key={side}>
          <PopoverTrigger render={<Button variant="secondary" size="sm" />}>{side}</PopoverTrigger>
          <PopoverContent side={side} arrow className="w-56">
            <PopoverTitle>Opens {side}</PopoverTitle>
            <PopoverDescription>Flips to the other side when there's no room.</PopoverDescription>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
};

export const IconTrigger: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Icon-only triggers need a label; `IconButton` supplies `aria-label` and a native tooltip.",
      },
    },
  },
  render: () => (
    <Popover>
      <PopoverTrigger
        render={
          <IconButton label="Filters" variant="secondary">
            <SlidersHorizontal aria-hidden="true" />
          </IconButton>
        }
      />
      <PopoverContent align="start">
        <PopoverTitle>Filters</PopoverTitle>
        <PopoverDescription>No filters applied.</PopoverDescription>
      </PopoverContent>
    </Popover>
  ),
};
