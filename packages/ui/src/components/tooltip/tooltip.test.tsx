import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../button";
import { Tooltip, TooltipProvider } from "./tooltip";

describe("Tooltip", () => {
  it("opens on keyboard focus and closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Tooltip label="Uses delayed market data">
          <Button variant="ghost">Why delayed?</Button>
        </Tooltip>
      </TooltipProvider>,
    );

    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Uses delayed market data",
    );
    expect(
      screen.getByRole("button", { name: "Why delayed?" }),
    ).toHaveAccessibleDescription("Uses delayed market data");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
