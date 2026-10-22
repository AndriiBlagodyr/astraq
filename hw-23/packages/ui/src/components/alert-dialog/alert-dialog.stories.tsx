import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "./alert-dialog";

const meta = {
  title: "Components/AlertDialog",
  parameters: {
    docs: {
      description: {
        component:
          "A modal that needs a decision (`role=\"alertdialog\"`). Clicking the backdrop does nothing; Escape cancels. Put Cancel first so it takes initial focus, and a stray Enter never confirms.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="danger" />}>Close all positions</AlertDialogTrigger>
      <AlertDialogContent
        title="Close all 6 positions?"
        description="Market orders are sent for every open paper position. Fills use the next available price."
      >
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="secondary" />}>Keep positions</AlertDialogClose>
          <AlertDialogClose render={<Button variant="danger" />}>Close all</AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const Confirm: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button />}>Run backtest</AlertDialogTrigger>
      <AlertDialogContent
        title="Run on 20 years of data?"
        description="This backtest covers 5,040 trading days and usually takes about a minute."
      >
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="secondary" />}>Cancel</AlertDialogClose>
          <AlertDialogClose render={<Button />}>Run backtest</AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
