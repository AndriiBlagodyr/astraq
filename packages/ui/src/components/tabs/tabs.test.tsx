import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function SymbolTabs() {
  return (
    <Tabs defaultValue="overview">
      <TabsList aria-label="Symbol sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="signals">Signals</TabsTrigger>
        <TabsTrigger value="news" disabled>
          News
        </TabsTrigger>
        <TabsTrigger value="risk">Risk</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview panel</TabsContent>
      <TabsContent value="signals">Signals panel</TabsContent>
      <TabsContent value="risk">Risk panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("moves with arrow keys, skips disabled tabs, and wraps", async () => {
    const user = userEvent.setup();
    render(<SymbolTabs />);

    await user.tab();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Signals" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Signals panel");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Risk" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveFocus();
  });

  it("jumps with Home and End", async () => {
    const user = userEvent.setup();
    render(<SymbolTabs />);

    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Risk" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveFocus();
  });

  it("moves focus from the tab list into the active panel", async () => {
    const user = userEvent.setup();
    render(<SymbolTabs />);

    await user.tab();
    await user.tab();
    expect(screen.getByRole("tabpanel")).toHaveFocus();
  });
});
