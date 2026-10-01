import type { Meta, StoryObj } from "@storybook/react-vite";
import { SlidersHorizontal } from "lucide-react";
import { StateGrid, pseudoStatesFor } from "../../stories/state-grid";
import { Button } from "../button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "./collapsible";

const meta = {
  title: "Components/Collapsible",
  component: Collapsible,
  parameters: {
    docs: {
      description: {
        component:
          "One section that shows and hides. The trigger gets `aria-expanded`. For a stack of headed sections, use Accordion.",
      },
    },
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Collapsible {...args} className="max-w-md">
      <CollapsibleTrigger>Raw provider payload</CollapsibleTrigger>
      <CollapsiblePanel>
        <pre className="m-0 overflow-x-auto rounded-md border border-border bg-surface-muted p-3 font-mono text-xs text-secondary">
          {JSON.stringify({ symbol: "AAPL", o: 227.1, h: 229.4, l: 226.3, c: 228.9 }, null, 2)}
        </pre>
      </CollapsiblePanel>
    </Collapsible>
  ),
};

export const AsButton: Story = {
  render: () => (
    <Collapsible className="max-w-md">
      <CollapsibleTrigger hideChevron render={<Button variant="secondary" size="sm" />}>
        <SlidersHorizontal aria-hidden="true" />
        Advanced filters
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <p className="m-0 text-sm text-secondary">Sector, market cap and volume filters go here.</p>
      </CollapsiblePanel>
    </Collapsible>
  ),
};

export const States: Story = {
  parameters: pseudoStatesFor("[data-slot=collapsible-trigger]"),
  render: () => (
    <StateGrid
      extraRows={[
        {
          id: "open",
          label: "Open",
          content: (
            <Collapsible defaultOpen>
              <CollapsibleTrigger>Details</CollapsibleTrigger>
              <CollapsiblePanel className="text-sm text-secondary">Shown.</CollapsiblePanel>
            </Collapsible>
          ),
        },
        {
          id: "disabled",
          label: "Disabled",
          content: (
            <Collapsible disabled>
              <CollapsibleTrigger>Details</CollapsibleTrigger>
              <CollapsiblePanel>Hidden.</CollapsiblePanel>
            </Collapsible>
          ),
        },
      ]}
    >
      {() => (
        <Collapsible>
          <CollapsibleTrigger>Details</CollapsibleTrigger>
          <CollapsiblePanel>Hidden.</CollapsiblePanel>
        </Collapsible>
      )}
    </StateGrid>
  ),
};
