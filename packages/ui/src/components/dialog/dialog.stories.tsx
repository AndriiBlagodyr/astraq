import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { Feedback } from "../feedback";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "./dialog";

const meta = {
  title: "Components/Dialog",
  parameters: {
    docs: {
      description: {
        component:
          "Focus moves into the dialog and is trapped. Escape or the close button dismisses; focus returns to the trigger.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Review order</Button>
      </DialogTrigger>
      <DialogContent
        title="Review paper order"
        description="Confirm the simulated order before submission."
      >
        <Feedback
          title="Buy 10 shares of AAPL"
          description="Estimated value: $2,140.50"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Back</Button>
          </DialogClose>
          <Button>Confirm order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="danger">Delete strategy</Button>
      </DialogTrigger>
      <DialogContent
        title="Delete “SMA crossover”?"
        description="Backtest history for this strategy is removed too. This can’t be undone."
      >
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep strategy</Button>
          </DialogClose>
          <Button variant="danger">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
