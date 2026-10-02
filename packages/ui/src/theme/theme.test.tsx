import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { THEME_NAMES, ThemeProvider, ThemeScript, useTheme } from "./index";

function ThemeHarness() {
  const { mode, modePreference, theme, toggleMode, setMode, setTheme } =
    useTheme();

  return (
    <>
      <output>{`${theme}:${mode}:${modePreference}`}</output>
      <DensityHarness />
      <button type="button" onClick={toggleMode}>
        Toggle mode
      </button>
      <button type="button" onClick={() => setMode("system")}>
        Use system
      </button>
      <button type="button" onClick={() => setTheme("terminal")}>
        Use terminal
      </button>
    </>
  );
}

function DensityHarness() {
  const { density, densityPreference, setDensity } = useTheme();

  return (
    <>
      <output>{`density ${density}:${densityPreference}`}</output>
      <button type="button" onClick={() => setDensity("compact")}>
        Use compact
      </button>
      <button type="button" onClick={() => setDensity("comfortable")}>
        Use comfortable
      </button>
      <button type="button" onClick={() => setDensity("theme")}>
        Use theme density
      </button>
    </>
  );
}

/** Controllable prefers-color-scheme for jsdom, which has no matchMedia. */
function mockColorScheme(initial: "light" | "dark") {
  let prefersLight = initial === "light";
  const listeners = new Set<() => void>();

  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes("light") ? prefersLight : !prefersLight;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  })) as unknown as typeof window.matchMedia;

  return (scheme: "light" | "dark") => {
    prefersLight = scheme === "light";
    listeners.forEach((listener) => listener());
  };
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.mode = "dark";
    document.documentElement.dataset.theme = "forelume";
    delete document.documentElement.dataset.density;
  });

  it("updates mode and brand theme independently", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByText("forelume:dark:system")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Toggle mode" }));
    expect(screen.getByText("forelume:light:light")).toBeVisible();
    expect(document.documentElement.dataset.mode).toBe("light");

    await user.click(screen.getByRole("button", { name: "Use terminal" }));
    expect(screen.getByText("terminal:light:light")).toBeVisible();
    expect(document.documentElement.dataset.theme).toBe("terminal");
    expect(localStorage.getItem("astraq-theme")).toBe("terminal");
  });

  it("follows the OS color scheme while the preference is system", async () => {
    const user = userEvent.setup();
    const setScheme = mockColorScheme("dark");
    localStorage.setItem("astraq-color-mode", "light");
    document.documentElement.dataset.mode = "light";

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Use system" }));
    expect(screen.getByText("forelume:dark:system")).toBeVisible();

    act(() => setScheme("light"));
    expect(screen.getByText("forelume:light:system")).toBeVisible();
    expect(document.documentElement.dataset.mode).toBe("light");

    // An explicit choice stops following the OS.
    await user.click(screen.getByRole("button", { name: "Toggle mode" }));
    act(() => setScheme("light"));
    expect(screen.getByText("forelume:dark:dark")).toBeVisible();
  });
});

describe("density", () => {
  it("follows the theme's default until the user picks one", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );
    const root = document.documentElement;

    expect(screen.getByText("density comfortable:theme")).toBeVisible();

    // Terminal defaults to compact; no attribute, so its CSS default applies.
    await user.click(screen.getByRole("button", { name: "Use terminal" }));
    expect(screen.getByText("density compact:theme")).toBeVisible();
    expect(root.dataset.density).toBeUndefined();

    // An explicit choice overrides every theme and is remembered.
    await user.click(screen.getByRole("button", { name: "Use comfortable" }));
    expect(screen.getByText("density comfortable:comfortable")).toBeVisible();
    expect(root.dataset.density).toBe("comfortable");
    expect(localStorage.getItem("astraq-density")).toBe("comfortable");

    await user.click(screen.getByRole("button", { name: "Use theme density" }));
    expect(screen.getByText("density compact:theme")).toBeVisible();
    expect(root.dataset.density).toBeUndefined();
  });
});

describe("ThemeScript", () => {
  it("inlines every registered theme so new themes need no script change", () => {
    const html = renderToStaticMarkup(<ThemeScript />);
    for (const name of THEME_NAMES) {
      expect(html).toContain(`"${name}"`);
    }
  });
});
