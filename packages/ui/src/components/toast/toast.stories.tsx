import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { ToastProvider, useToastManager, type ToastTone } from "./toast";

const meta = {
  title: "Components/Toast",
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Brief, non-blocking messages, stacked bottom-right and announced by a live region. Hovering or focusing the stack pauses and fans it out; F6 moves focus into it; swipe right or down to dismiss.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const examples: Record<ToastTone, { title: string; description: string }> = {
  info: { title: "Market closed", description: "Orders queue until the 9:30 ET open." },
  success: { title: "Order filled", description: "Bought 10 AAPL at $214.05." },
  warning: { title: "Data delayed", description: "Quotes are 15 minutes behind." },
  danger: { title: "Order rejected", description: "Insufficient buying power for 50 NVDA." },
};

function ToneButtons() {
  const toast = useToastManager();
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(examples) as ToastTone[]).map((tone) => (
        <Button
          key={tone}
          variant="secondary"
          onClick={() =>
            toast.add({
              ...examples[tone],
              type: tone,
              // Failures interrupt; everything else waits its turn.
              priority: tone === "danger" ? "high" : "low",
            })
          }
        >
          {tone}
        </Button>
      ))}
    </div>
  );
}

export const Tones: Story = {
  render: () => <ToneButtons />,
};

function UndoExample() {
  const toast = useToastManager();
  return (
    <Button
      variant="danger"
      onClick={() => {
        const id = toast.add({
          title: "Alert deleted",
          description: "AAPL above $220.",
          timeout: 8000,
          actionProps: {
            children: "Undo",
            onClick: () => {
              toast.close(id);
              toast.add({ title: "Alert restored", type: "success" });
            },
          },
        });
      }}
    >
      Delete alert
    </Button>
  );
}

export const WithUndo: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Destructive actions that can be reversed confirm with an undo toast instead of a dialog. It stays longer so there's time to act.",
      },
    },
  },
  render: () => <UndoExample />,
};

function PromiseExample() {
  const toast = useToastManager();
  return (
    <Button
      onClick={() =>
        toast.promise(new Promise((resolve) => setTimeout(resolve, 1800)), {
          loading: { title: "Running backtest…", description: "SMA crossover on AAPL." },
          success: { title: "Backtest complete", description: "+18.4% vs +12.1% buy and hold.", type: "success" },
          error: { title: "Backtest failed", type: "danger" },
        })
      }
    >
      Run backtest
    </Button>
  );
}

export const Promise_: Story = {
  name: "Promise",
  render: () => <PromiseExample />,
};
