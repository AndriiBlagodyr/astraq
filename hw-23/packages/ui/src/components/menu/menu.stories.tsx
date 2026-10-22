import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ChevronDown, Copy, Pencil, Share2, Star, Trash2 } from "lucide-react";
import { Button } from "../button";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "./menu";

const meta = {
  title: "Components/Menu",
  parameters: {
    docs: {
      description: {
        component:
          "A list of actions. Enter, Space or ArrowDown opens it; arrows move, typing jumps to a match, ArrowRight opens a submenu, Escape closes and returns focus.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Menu>
      <MenuTrigger render={<Button variant="secondary" />}>
        Strategy
        <ChevronDown aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>
        <MenuItem>
          <Pencil aria-hidden="true" />
          Rename
          <MenuShortcut>F2</MenuShortcut>
        </MenuItem>
        <MenuItem>
          <Copy aria-hidden="true" />
          Duplicate
          <MenuShortcut>Ctrl+D</MenuShortcut>
        </MenuItem>
        <MenuSub>
          <MenuSubTrigger>
            <Share2 aria-hidden="true" />
            Export
          </MenuSubTrigger>
          <MenuSubContent>
            <MenuItem>JSON definition</MenuItem>
            <MenuItem>Backtest trades (CSV)</MenuItem>
            <MenuItem disabled>PDF report</MenuItem>
          </MenuSubContent>
        </MenuSub>
        <MenuItem disabled>
          <Star aria-hidden="true" />
          Publish
        </MenuItem>
        <MenuSeparator />
        <MenuItem tone="danger">
          <Trash2 aria-hidden="true" />
          Delete strategy
        </MenuItem>
      </MenuContent>
    </Menu>
  ),
};

function ChartOptionsMenu() {
  const [interval, setInterval] = useState("1d");
  const [volume, setVolume] = useState(true);
  const [grid, setGrid] = useState(false);

  return (
    <Menu>
      <MenuTrigger render={<Button variant="secondary" />}>
        View
        <ChevronDown aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>
        <MenuRadioGroup value={interval} onValueChange={setInterval}>
          <MenuGroupLabel>Interval</MenuGroupLabel>
          <MenuRadioItem value="1d">Daily</MenuRadioItem>
          <MenuRadioItem value="1w">Weekly</MenuRadioItem>
          <MenuRadioItem value="1mo">Monthly</MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Panes</MenuGroupLabel>
          <MenuCheckboxItem checked={volume} onCheckedChange={setVolume}>
            Volume
          </MenuCheckboxItem>
          <MenuCheckboxItem checked={grid} onCheckedChange={setGrid}>
            Grid lines
          </MenuCheckboxItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem inset>Reset view</MenuItem>
      </MenuContent>
    </Menu>
  );
}

export const CheckboxAndRadio: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Checkbox and radio items keep the menu open when toggled. `inset` lines plain items up with them.",
      },
    },
  },
  render: () => <ChartOptionsMenu />,
};

export const Links: Story = {
  render: () => (
    <Menu>
      <MenuTrigger render={<Button variant="ghost" />}>
        Account
        <ChevronDown aria-hidden="true" />
      </MenuTrigger>
      <MenuContent align="end">
        <MenuLinkItem href="#profile">Profile</MenuLinkItem>
        <MenuLinkItem href="#api-keys">API keys</MenuLinkItem>
        <MenuSeparator />
        <MenuItem>Sign out</MenuItem>
      </MenuContent>
    </Menu>
  ),
};
