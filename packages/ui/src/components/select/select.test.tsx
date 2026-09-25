import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormField } from "../form-field";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select";

describe("Select", () => {
  it("opens, navigates, and selects with the keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <FormField htmlFor="direction" label="Direction" hint="Trigger side">
        <Select defaultValue="above" onValueChange={onValueChange}>
          <SelectTrigger />
          <SelectContent>
            <SelectItem value="above">Moves above</SelectItem>
            <SelectItem value="below">Moves below</SelectItem>
          </SelectContent>
        </Select>
      </FormField>,
    );

    const trigger = screen.getByRole("combobox", { name: "Direction" });
    expect(trigger).toHaveAccessibleDescription("Trigger side");

    await user.tab();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("listbox")).toBeVisible();

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("below");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent("Moves below");
    expect(trigger).toHaveFocus();
  });
});
