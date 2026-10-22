import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl, SegmentedControlItem } from "./segmented-control";

// Hand-built keyboard pattern (no library underneath), so it gets a test.
function Timeframes({ onValueChange }: { onValueChange?: (value: string) => void }) {
  return (
    <>
      <button type="button">Before</button>
      <SegmentedControl aria-label="Timeframe" defaultValue="1d" onValueChange={onValueChange}>
        <SegmentedControlItem value="1d">1D</SegmentedControlItem>
        <SegmentedControlItem value="1w" disabled>
          1W
        </SegmentedControlItem>
        <SegmentedControlItem value="1m">1M</SegmentedControlItem>
        <SegmentedControlItem value="1y">1Y</SegmentedControlItem>
      </SegmentedControl>
      <button type="button">After</button>
    </>
  );
}

describe("SegmentedControl", () => {
  it("is one tab stop that lands on the checked segment", async () => {
    const user = userEvent.setup();
    render(<Timeframes />);

    expect(screen.getByRole("radiogroup", { name: "Timeframe" })).toBeInTheDocument();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("radio", { name: "1D" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("moves and checks with arrows, skipping disabled segments and wrapping", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Timeframes onValueChange={onValueChange} />);

    await user.click(screen.getByRole("radio", { name: "1D" }));
    expect(onValueChange).not.toHaveBeenCalled();

    await user.keyboard("{ArrowRight}");
    const month = screen.getByRole("radio", { name: "1M" });
    expect(month).toHaveFocus();
    expect(month).toBeChecked();
    expect(onValueChange).toHaveBeenLastCalledWith("1m");

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("radio", { name: "1D" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "1D" })).toBeChecked();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "1Y" })).toBeChecked();

    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "1D" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "1Y" })).toHaveAttribute("tabindex", "-1");
  });
});
