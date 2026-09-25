import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./dialog";

function OrderDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Review order</Button>
      </DialogTrigger>
      <DialogContent title="Review order" description="Confirm first.">
        <DialogClose asChild>
          <Button variant="secondary">Back</Button>
        </DialogClose>
        <Button>Confirm</Button>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens with a name and description, closes with the close button", async () => {
    const user = userEvent.setup();
    render(<OrderDialog />);

    await user.click(screen.getByRole("button", { name: "Review order" }));
    const dialog = screen.getByRole("dialog", { name: "Review order" });
    expect(dialog).toHaveAccessibleDescription("Confirm first.");

    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("moves focus in, traps Tab, and returns focus on Escape", async () => {
    const user = userEvent.setup();
    render(<OrderDialog />);

    const trigger = screen.getByRole("button", { name: "Review order" });
    await user.click(trigger);
    const back = screen.getByRole("button", { name: "Back" });
    expect(back).toHaveFocus();

    // Back -> Confirm -> Close -> wraps to Back.
    await user.tab();
    await user.tab();
    await user.tab();
    expect(back).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
