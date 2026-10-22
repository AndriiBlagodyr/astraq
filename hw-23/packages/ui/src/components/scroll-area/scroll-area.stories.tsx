import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollArea } from "./scroll-area";

const SYMBOLS = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "BRK.B", "JPM", "V",
  "UNH", "XOM", "JNJ", "MA", "PG", "HD", "COST", "ABBV", "MRK", "AVGO",
];

const meta = {
  title: "Components/ScrollArea",
  component: ScrollArea,
  args: { scrollbars: "vertical", fade: true },
  argTypes: {
    scrollbars: { control: "inline-radio", options: ["vertical", "horizontal", "both"] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A scroll container with themed overlay scrollbars that show while hovering or scrolling. Edges with more content past them fade. The viewport takes focus while it overflows, so the keyboard can scroll it; the ring draws on the root.",
      },
    },
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <ScrollArea
      {...args}
      aria-label="Watchlist"
      className="h-64 w-64 border border-border bg-surface"
      contentClassName="p-1"
    >
      <ul className="m-0 grid list-none p-0">
        {SYMBOLS.map((symbol) => (
          <li
            key={symbol}
            className="flex justify-between rounded-sm px-3 py-2 text-sm text-foreground hover:bg-surface-muted"
          >
            <span className="font-semibold">{symbol}</span>
            <span className="text-secondary tabular-nums">{(symbol.length * 37.13).toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <ScrollArea
      scrollbars="horizontal"
      aria-label="Sectors"
      className="w-96 max-w-full"
      contentClassName="flex w-max gap-2 py-2"
    >
      {["Technology", "Healthcare", "Financials", "Energy", "Industrials", "Utilities", "Materials", "Real estate", "Communication"].map(
        (sector) => (
          <span
            key={sector}
            className="rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-secondary"
          >
            {sector}
          </span>
        ),
      )}
    </ScrollArea>
  ),
};

export const Both: Story = {
  render: () => (
    <ScrollArea
      scrollbars="both"
      aria-label="Correlation matrix"
      className="h-64 w-80 border border-border bg-surface"
      contentClassName="p-3"
    >
      <div className="grid w-max grid-cols-[repeat(12,4rem)] gap-1">
        {Array.from({ length: 144 }, (_, index) => (
          <span
            key={index}
            className="grid h-10 place-items-center rounded-sm bg-surface-muted text-xs text-secondary tabular-nums"
          >
            {(((index * 37) % 200) / 100 - 1).toFixed(2)}
          </span>
        ))}
      </div>
    </ScrollArea>
  ),
};
