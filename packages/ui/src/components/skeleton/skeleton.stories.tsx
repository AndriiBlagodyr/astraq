import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../card";
import { Skeleton, SkeletonText } from "./skeleton";

const meta = {
  title: "Components/Skeleton",
  parameters: {
    docs: {
      description: {
        component:
          "Placeholders shaped like the content that's loading. Hidden from assistive tech: mark the region `aria-busy` with a label. The shimmer is static under reduced motion.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const QuoteCard: Story = {
  render: () => (
    <Card aria-busy="true" aria-label="Loading AAPL quote" className="grid max-w-sm gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-6 w-16 rounded-pill" />
      </div>
      <Skeleton className="h-36 w-full" />
      <SkeletonText lines={2} />
    </Card>
  ),
};

export const WatchlistRows: Story = {
  render: () => (
    <div aria-busy="true" aria-label="Loading watchlist" className="grid max-w-md gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  ),
};

export const Paragraph: Story = {
  render: () => <SkeletonText lines={4} className="max-w-md" />,
};
