import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../badge";
import { PreviewCard, PreviewCardContent, PreviewCardTrigger } from "./preview-card";

const meta = {
  title: "Components/PreviewCard",
  parameters: {
    docs: {
      description: {
        component:
          "A visual preview of a link's destination on hover or focus. It isn't announced to screen readers, so the link must stand alone and the card may hold nothing that isn't on the linked page.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SymbolPreview: Story = {
  render: () => (
    <p className="max-w-md text-sm leading-7 text-secondary">
      The strategy entered{" "}
      <PreviewCard>
        <PreviewCardTrigger href="#aapl">AAPL</PreviewCardTrigger>
        <PreviewCardContent className="grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 font-semibold text-foreground">Apple Inc.</p>
              <p className="m-0 text-xs text-muted">NASDAQ · Technology</p>
            </div>
            <Badge tone="positive">+2.84%</Badge>
          </div>
          <p className="m-0 font-mono text-2xl font-semibold text-foreground tabular-nums">$214.05</p>
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted">52w range</dt>
            <dd className="m-0 text-right text-secondary tabular-nums">$164.08 – $237.23</dd>
            <dt className="text-muted">Volume</dt>
            <dd className="m-0 text-right text-secondary tabular-nums">48.2M</dd>
          </dl>
        </PreviewCardContent>
      </PreviewCard>{" "}
      on the golden cross and held for 34 trading days.
    </p>
  ),
};
