import { cn } from "./cn";

// Unknown tokens are kept by twMerge, so a later override silently loses to
// the default. IconButton's `px-0` over `px-inset-md` rendered 2px icons.
describe("cn", () => {
  it.each([
    ["px-inset-md", "px-0"],
    ["min-h-control-md", "min-h-0"],
    ["h-control-sm", "h-control-lg"],
    ["py-cell-y", "py-head-y"],
    ["rounded-pill", "rounded-md"],
    ["shadow-brand", "shadow-none"],
    ["backdrop-blur-surface", "backdrop-blur-overlay"],
  ])("lets %s be overridden by %s", (base, override) => {
    expect(cn(base, override)).toBe(override);
  });

  it("keeps custom tokens that do not conflict", () => {
    expect(cn("px-inset-md", "py-cell-y", "text-on-brand", "text-sm")).toBe(
      "px-inset-md py-cell-y text-on-brand text-sm",
    );
  });
});
