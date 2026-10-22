import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ChartCandlestick,
  ChartLine,
  Crosshair,
  Download,
  Grid3x3,
  Maximize2,
  Ruler,
} from "lucide-react";
import { StateGrid, pseudoStatesFor } from "../../stories/state-grid";
import { Toggle } from "../toggle";
import { ToggleGroup } from "../toggle-group";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarLink,
  ToolbarSeparator,
} from "./toolbar";

const meta = {
  title: "Components/Toolbar",
  component: Toolbar,
  parameters: {
    docs: {
      description: {
        component:
          "A row of controls with one tab stop: Tab enters and leaves, arrow keys move inside. Toggles join through `render={<Toggle />}`. Disabled buttons stay focusable, so arrows don't skip them. Label the toolbar, each group, and every icon-only button.",
      },
    },
  },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Toolbar {...args} aria-label="Chart tools">
      <ToggleGroup aria-label="Chart type" defaultValue={["candles"]} className="gap-1">
        <ToolbarButton render={<Toggle value="candles" />} aria-label="Candles">
          <ChartCandlestick aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton render={<Toggle value="line" />} aria-label="Line">
          <ChartLine aria-hidden="true" />
        </ToolbarButton>
      </ToggleGroup>
      <ToolbarSeparator />
      <ToolbarGroup aria-label="Overlays">
        <ToolbarButton render={<Toggle defaultPressed />} aria-label="Grid">
          <Grid3x3 aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton render={<Toggle />} aria-label="Crosshair">
          <Crosshair aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton aria-label="Measure" disabled>
          <Ruler aria-hidden="true" />
        </ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarButton aria-label="Export">
        <Download aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton aria-label="Full screen">
        <Maximize2 aria-hidden="true" />
      </ToolbarButton>
      <ToolbarSeparator />
      <ToolbarLink href="#">Edited 5m ago</ToolbarLink>
    </Toolbar>
  ),
};

export const WithText: Story = {
  render: () => (
    <Toolbar aria-label="Table actions">
      <ToolbarButton>Export CSV</ToolbarButton>
      <ToolbarButton>Columns</ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton variant="outline" size="md">
        Compare
      </ToolbarButton>
    </Toolbar>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Toolbar orientation="vertical" aria-label="Drawing tools">
      <ToolbarButton aria-label="Crosshair">
        <Crosshair aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton aria-label="Measure">
        <Ruler aria-hidden="true" />
      </ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton aria-label="Full screen">
        <Maximize2 aria-hidden="true" />
      </ToolbarButton>
    </Toolbar>
  ),
};

export const States: Story = {
  parameters: pseudoStatesFor("[data-slot=toolbar-button]"),
  render: () => (
    <StateGrid
      extraRows={[
        {
          id: "pressed",
          label: "Pressed",
          content: (
            <Toolbar aria-label="Pressed">
              <ToolbarButton render={<Toggle defaultPressed />}>Grid</ToolbarButton>
            </Toolbar>
          ),
        },
        {
          id: "disabled",
          label: "Disabled",
          content: (
            <Toolbar aria-label="Disabled">
              <ToolbarButton disabled>Export</ToolbarButton>
            </Toolbar>
          ),
        },
      ]}
    >
      {(rowId) => (
        <Toolbar aria-label={rowId}>
          <ToolbarButton>Export</ToolbarButton>
          <ToolbarButton variant="outline">Compare</ToolbarButton>
        </Toolbar>
      )}
    </StateGrid>
  ),
};
