import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bot } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

// An inline SVG, so the story works offline and never flakes.
const PORTRAIT = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3b5bdb"/><circle cx="32" cy="25" r="11" fill="#dbe4ff"/><rect x="13" y="41" width="38" height="30" rx="15" fill="#dbe4ff"/></svg>',
)}`;

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  args: { size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: {
    docs: {
      description: {
        component:
          "A picture with a fallback. The fallback shows until the image loads and stays if it fails. `alt` names the person; use `alt=\"\"` when the name is next to it.",
      },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage src={PORTRAIT} alt="Ada Lovelace" />
      <AvatarFallback>AL</AvatarFallback>
    </Avatar>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="grid gap-4">
      {(["sm", "md", "lg"] as const).map((size) => (
        <div key={size} className="flex items-center gap-3">
          <Avatar size={size}>
            <AvatarImage src={PORTRAIT} alt="Ada Lovelace" />
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Avatar size={size}>
            <AvatarImage src="/does-not-exist.png" alt="Grace Hopper" />
            <AvatarFallback>GH</AvatarFallback>
          </Avatar>
          <Avatar size={size}>
            <AvatarFallback>
              <Bot role="img" aria-label="Strategy bot" />
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted">{size}: image, failed image, icon</span>
        </div>
      ))}
    </div>
  ),
};

export const WithName: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src={PORTRAIT} alt="" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
      <div className="grid">
        <span className="text-sm font-semibold text-foreground">Ada Lovelace</span>
        <span className="text-xs text-secondary">Paper account</span>
      </div>
    </div>
  ),
};
