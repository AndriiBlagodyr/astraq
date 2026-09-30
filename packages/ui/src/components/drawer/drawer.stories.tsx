import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { Field, FieldLabel } from "../field";
import { Input } from "../input";
import { NumberField } from "../number-field";
import { SegmentedControl, SegmentedControlItem } from "../segmented-control";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerTrigger } from "./drawer";

const meta = {
  title: "Components/Drawer",
  parameters: {
    docs: {
      description: {
        component:
          "A modal panel from an edge. Focus is trapped, Escape closes, focus returns to the trigger. Swipe toward the edge to dismiss on touch.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const OrderTicket: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button />}>New order</DrawerTrigger>
      <DrawerContent title="Paper order · AAPL" description="Simulated fills use the shared fill model.">
        <SegmentedControl aria-label="Side" defaultValue="buy">
          <SegmentedControlItem value="buy">Buy</SegmentedControlItem>
          <SegmentedControlItem value="sell">Sell</SegmentedControlItem>
        </SegmentedControl>
        <Field>
          <FieldLabel>Quantity</FieldLabel>
          <NumberField defaultValue={10} min={1} />
        </Field>
        <Field>
          <FieldLabel>Limit price</FieldLabel>
          <Input defaultValue="214.05" inputMode="decimal" />
        </Field>
        <DrawerFooter>
          <DrawerClose render={<Button variant="secondary" />}>Cancel</DrawerClose>
          <Button>Place order</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(["left", "right", "bottom"] as const).map((side) => (
        <Drawer key={side} side={side}>
          <DrawerTrigger render={<Button variant="secondary" />}>From {side}</DrawerTrigger>
          <DrawerContent
            title={side === "bottom" ? "Watchlist" : "Filters"}
            description={
              side === "bottom"
                ? "A bottom sheet for narrow screens. Drag the handle down to close."
                : `Slides in from the ${side}.`
            }
          >
            <DrawerFooter>
              <DrawerClose render={<Button variant="secondary" />}>Done</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ))}
    </div>
  ),
};
