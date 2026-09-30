import type { Meta, StoryObj } from "@storybook/react-vite";
import { BellPlus, ChartLine, Copy, Trash2 } from "lucide-react";
import {
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from "../menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "./context-menu";

const meta = {
  title: "Components/ContextMenu",
  parameters: {
    docs: {
      description: {
        component:
          "Right-click or long-press opens a menu at the pointer. It's built from the Menu item parts. A context menu is a shortcut: every action must also be reachable some other way.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger
        tabIndex={0}
        aria-label="AAPL chart. Open the context menu for actions."
        className="grid h-48 w-full max-w-md place-items-center rounded-lg border border-dashed border-border-strong text-sm text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        Right-click the AAPL chart
      </ContextMenuTrigger>
      <ContextMenuContent>
        <MenuItem>
          <BellPlus aria-hidden="true" />
          Add price alert
          <MenuShortcut>Alt+A</MenuShortcut>
        </MenuItem>
        <MenuItem>
          <Copy aria-hidden="true" />
          Copy price
        </MenuItem>
        <MenuSub>
          <MenuSubTrigger>
            <ChartLine aria-hidden="true" />
            Add indicator
          </MenuSubTrigger>
          <MenuSubContent>
            <MenuItem>SMA 50</MenuItem>
            <MenuItem>EMA 20</MenuItem>
            <MenuItem>RSI 14</MenuItem>
          </MenuSubContent>
        </MenuSub>
        <MenuSeparator />
        <MenuItem tone="danger">
          <Trash2 aria-hidden="true" />
          Remove drawings
        </MenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
