import { render, screen } from "@testing-library/react";
import { Input } from "../input";
import { FormField } from "./form-field";

describe("FormField", () => {
  it("labels the control and links the hint as its description", () => {
    render(
      <FormField htmlFor="symbol" label="Symbol" hint="Ticker, e.g. AAPL">
        <Input />
      </FormField>,
    );

    const input = screen.getByLabelText("Symbol");
    expect(input).toHaveAttribute("id", "symbol");
    expect(input).toHaveAccessibleDescription("Ticker, e.g. AAPL");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks the control invalid and announces the error", () => {
    render(
      <FormField htmlFor="price" label="Price" error="Enter a price">
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
      <FormField htmlFor="qty" label="Quantity" required>
        <Input />
      </FormField>,
    );

    expect(screen.getByRole("textbox", { name: "Quantity" })).toBeRequired();
  });

  it("lets explicit props win over field context", () => {
    render(
      <FormField htmlFor="a" label="A" error="Bad">
        <Input invalid={false} aria-describedby="extra" />
      </FormField>,
    );

    const input = screen.getByLabelText("A");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAttribute("aria-describedby", "a-description extra");
  });
});

describe("Input", () => {
  it("works standalone with the invalid prop", () => {
    render(<Input aria-label="Search" invalid />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});
