import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./dialog";

function OrderDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Review order</DialogTrigger>
      <DialogContent title="Review order" description="Confirm first.">
        <DialogClose render={<Button variant="secondary" />}>Back</DialogClose>
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

    // Back -> Confirm -> Close -> wraps to Back. The wrap goes through a
    // focus guard that redirects on the next tick.
    await user.tab();
    await user.tab();
    await user.tab();
    await waitFor(() => expect(back).toHaveFocus());

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
