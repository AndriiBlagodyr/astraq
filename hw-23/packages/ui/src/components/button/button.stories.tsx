import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Play, Plus, Settings2, Trash2 } from "lucide-react";
import { StateGrid, pseudoStates } from "../../stories/state-grid";
import { Button, IconButton } from "./button";

const meta = {
  title: "Components/Button",
  component: Button,
  args: {
    children: "Run backtest",
    variant: "primary",
    size: "md",
    loading: false,
    disabled: false,
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary", "ghost", "danger"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const variants = ["primary", "secondary", "ghost", "danger"] as const;

export const States: Story = {
  parameters: pseudoStates,
  render: () => (
    <StateGrid
      extraRows={[
        {
          id: "disabled",
          label: "Disabled",
          content: variants.map((variant) => (
            <Button key={variant} variant={variant} disabled>
              {variant}
            </Button>
          )),
        },
        {
          id: "loading",
          label: "Loading",
          content: variants.map((variant) => (
            <Button key={variant} variant={variant} loading>
              {variant}
            </Button>
          )),
        },
      ]}
    >
      {() =>
        variants.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))
      }
    </StateGrid>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        <Play aria-hidden="true" />
        Run backtest
      </Button>
      <Button variant="secondary">
        New strategy
        <ArrowRight aria-hidden="true" />
      </Button>
      <Button variant="danger" size="sm">
        <Trash2 aria-hidden="true" />
        Delete
      </Button>
    </div>
  ),
};

export const Loading: Story = {
  args: { loading: true, children: "Submitting order" },
  parameters: {
    docs: {
      description: {
        story:
          "Loading keeps the button focusable and its width stable, announces `aria-busy`, and ignores activation.",
      },
    },
  },
};

export const IconButtons: Story = {
  parameters: pseudoStates,
  render: () => (
    <StateGrid
      extraRows={[
        {
          id: "icon-disabled",
          label: "Disabled",
          content: (
            <IconButton label="Add symbol" variant="secondary" disabled>
              <Plus aria-hidden="true" />
            </IconButton>
          ),
        },
      ]}
    >
      {() => (
        <>
          <IconButton label="Add symbol" size="sm" variant="secondary">
            <Plus aria-hidden="true" />
          </IconButton>
          <IconButton label="Settings" variant="secondary">
            <Settings2 aria-hidden="true" />
          </IconButton>
          <IconButton label="Delete" size="lg" variant="ghost">
            <Trash2 aria-hidden="true" />
          </IconButton>
        </>
      )}
    </StateGrid>
  ),
};
