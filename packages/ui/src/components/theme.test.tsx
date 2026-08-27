import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "../index";

function ThemeHarness() {
  const { mode, theme, toggleMode, setTheme } = useTheme();

  return (
    <>
      <output>{`${theme}:${mode}`}</output>
      <button type="button" onClick={toggleMode}>
        Toggle mode
      </button>
      <button type="button" onClick={() => setTheme("terminal")}>
        Use terminal
      </button>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.mode = "dark";
    document.documentElement.dataset.theme = "astraq";
  });

  it("updates mode and brand theme independently", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByText("astraq:dark")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Toggle mode" }));
    expect(screen.getByText("astraq:light")).toBeVisible();
    expect(document.documentElement.dataset.mode).toBe("light");

    await user.click(screen.getByRole("button", { name: "Use terminal" }));
    expect(screen.getByText("terminal:light")).toBeVisible();
    expect(document.documentElement.dataset.theme).toBe("terminal");
    expect(localStorage.getItem("astraq-theme")).toBe("terminal");
  });
});
