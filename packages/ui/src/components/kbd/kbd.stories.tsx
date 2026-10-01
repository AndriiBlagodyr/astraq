import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Kbd, KbdGroup } from "./kbd";

const meta = {
  title: "Components/Kbd",
  component: Kbd,
  args: { children: "K", size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md"] } },
  parameters: {
    docs: {
      description: {
        component:
          "A key to press. Combinations nest in `KbdGroup` (a `kbd` of `kbd`s). Symbol and icon keys need `sr-only` text: `aria-label` isn't allowed on `kbd`. In menus, use `MenuShortcut`.",
      },
    },
  },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Combinations: Story = {
  render: () => (
    <dl className="m-0 grid w-fit grid-cols-[1fr_auto] items-center gap-x-10 gap-y-3 text-sm">
      <dt className="text-secondary">Command palette</dt>
      <dd className="m-0">
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </dd>
      <dt className="text-secondary">Command palette (macOS)</dt>
      <dd className="m-0">
        <KbdGroup>
          <Kbd>
            <span aria-hidden="true">⌘</span>
            <span className="sr-only">Command</span>
          </Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </dd>
      <dt className="text-secondary">Go to stocks</dt>
      <dd className="m-0">
        <KbdGroup>
          <Kbd>G</Kbd>
          <span>then</span>
          <Kbd>S</Kbd>
        </KbdGroup>
      </dd>
      <dt className="text-secondary">Move row</dt>
      <dd className="m-0">
        <KbdGroup>
          <Kbd size="sm">
            <ArrowUp aria-hidden="true" />
            <span className="sr-only">Up arrow</span>
          </Kbd>
          <Kbd size="sm">
            <ArrowDown aria-hidden="true" />
            <span className="sr-only">Down arrow</span>
          </Kbd>
        </KbdGroup>
      </dd>
    </dl>
  ),
};

export const InProse: Story = {
  render: () => (
    <p className="m-0 max-w-md text-sm leading-7 text-secondary">
      Press <Kbd size="sm">/</Kbd> to focus search, or <Kbd size="sm">?</Kbd> to see every
      shortcut.
    </p>
  ),
};
