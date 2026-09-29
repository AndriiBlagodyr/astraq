import { render, screen } from "@testing-library/react";
import { Input } from "../input";
import { FormField } from "./form-field";

describe("FormField", () => {
  it("labels the control and links the description", () => {
    render(
      <FormField label="Symbol" description="Ticker, e.g. AAPL">
        <Input />
      </FormField>,
    );

    const input = screen.getByLabelText("Symbol");
    expect(input).toHaveAccessibleDescription("Ticker, e.g. AAPL");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks the control invalid and announces the error", () => {
    render(
      <FormField label="Price" error="Enter a price">
        <Input />
      </FormField>,
    );

    const input = screen.getByLabelText("Price");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a price");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a price");
  });

  it("marks required controls without exposing the asterisk to AT", () => {
    render(
      <FormField label="Quantity" required>
        <Input />
      </FormField>,
    );

    expect(screen.getByRole("textbox", { name: "Quantity" })).toBeRequired();
  });
});

describe("Input", () => {
  it("works standalone with the invalid prop", () => {
    render(<Input aria-label="Search" invalid />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});
