import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  FormField,
  Input,
} from "../index";

describe("design system interactions", () => {
  it("supports button interaction and disabled state", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <>
        <Button onClick={onClick}>Run backtest</Button>
        <Button disabled onClick={onClick}>
          Unavailable
        </Button>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Run backtest" }));
    await user.click(screen.getByRole("button", { name: "Unavailable" }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Unavailable" })).toBeDisabled();
  });

  it("renders accessible form labels and validation state", () => {
    render(
      <FormField htmlFor="symbol" label="Symbol" error="Symbol is required">
        <Input id="symbol" invalid />
      </FormField>,
    );

    expect(screen.getByLabelText("Symbol")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Symbol is required");
  });

  it("opens and closes an accessible dialog", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Review order</Button>
        </DialogTrigger>
        <DialogContent
          title="Review order"
          description="Confirm before submitting."
        >
          Order details
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Review order" }));
    expect(screen.getByRole("dialog", { name: "Review order" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(
      screen.queryByRole("dialog", { name: "Review order" }),
    ).not.toBeInTheDocument();
  });
});
