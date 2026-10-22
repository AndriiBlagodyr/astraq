import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStatesFor } from "../../stories/state-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "Components/Tabs",
  parameters: {
    docs: {
      description: {
        component:
          "Keyboard: Arrow keys move between tabs and wrap, Home/End jump to the ends, disabled tabs are skipped, Tab moves into the panel.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="max-w-xl">
      <TabsList aria-label="Symbol sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="signals">Signals</TabsTrigger>
        <TabsTrigger value="news" disabled>
          News
        </TabsTrigger>
        <TabsTrigger value="risk">Risk</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="text-sm text-secondary">
        Price, volume, and key statistics.
      </TabsContent>
      <TabsContent value="signals" className="text-sm text-secondary">
        Model signals and confidence.
      </TabsContent>
      <TabsContent value="risk" className="text-sm text-secondary">
        Volatility and drawdown.
      </TabsContent>
    </Tabs>
  ),
};

export const States: Story = {
  parameters: pseudoStatesFor("[role=tab]:not([disabled])"),
  render: () => (
    <StateGrid>
      {(rowId) => (
        <Tabs defaultValue="a">
          <TabsList aria-label={rowId}>
            <TabsTrigger value="a">Selected</TabsTrigger>
            <TabsTrigger value="b">Idle</TabsTrigger>
            <TabsTrigger value="c" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </StateGrid>
  ),
};
