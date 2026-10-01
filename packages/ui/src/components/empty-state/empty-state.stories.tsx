import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlaskConical, ListPlus, SearchX } from "lucide-react";
import { Button } from "../button";
import { Card } from "../card";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  args: {
    title: "No watchlists yet",
    description: "Group the symbols you follow so their prices are one glance away.",
    icon: <ListPlus />,
    action: <Button>Create watchlist</Button>,
  },
  parameters: {
    docs: {
      description: {
        component:
          "What a region shows when it has nothing yet. Short copy and one clear action. It fades in on mount (CSS `@starting-style`), never bounces, and is instant under reduced motion.",
      },
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Card className="max-w-lg">
      <EmptyState {...args} />
    </Card>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="grid max-w-lg gap-4">
      <Card>
        <EmptyState
          icon={<FlaskConical />}
          title="Run your first backtest"
          description="Pick a strategy and a date range. Results land here with the equity curve and every fill."
          action={
            <>
              <Button>New backtest</Button>
              <Button variant="ghost">Read the guide</Button>
            </>
          }
        />
      </Card>
      <Card>
        <EmptyState
          icon={<SearchX />}
          title="No symbols match “ZZZZ”"
          description="Check the ticker, or search by company name."
          action={<Button variant="secondary">Clear search</Button>}
        />
      </Card>
      <Card>
        <EmptyState title="No fills in this range" />
      </Card>
    </div>
  ),
};
