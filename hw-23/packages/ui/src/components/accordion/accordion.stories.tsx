import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateGrid, pseudoStatesFor } from "../../stories/state-grid";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "./accordion";

const meta = {
  title: "Components/Accordion",
  component: Accordion,
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Headed sections that expand in place. Triggers are Tab stops (the APG pattern no longer uses arrow keys); Enter or Space toggles. The panel's height isn't animated (motion rule 4): content fades and settles in, and closing is instant.",
      },
    },
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

const faq = [
  {
    value: "fills",
    title: "How are backtest fills simulated?",
    body: "Orders fill at the next bar's open, with slippage and commission from the strategy's settings. Paper trading uses the same fill model.",
  },
  {
    value: "data",
    title: "Where does market data come from?",
    body: "End-of-day bars from the configured provider, stored as OHLCV hypertables. Intraday data arrives later.",
  },
  {
    value: "delete",
    title: "Can I delete a strategy that has runs?",
    body: "Archive it instead: runs keep a reference to the exact strategy version they used.",
  },
];

export const Playground: Story = {
  render: (args) => (
    <Accordion {...args} defaultValue={["fills"]}>
      {faq.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionPanel>{item.body}</AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion multiple defaultValue={["fills", "data"]}>
      {faq.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionPanel>{item.body}</AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

export const States: Story = {
  parameters: pseudoStatesFor("[data-slot=accordion-trigger]"),
  render: () => (
    <StateGrid
      extraRows={[
        {
          id: "open",
          label: "Open",
          content: (
            <Accordion defaultValue={["a"]} className="max-w-sm">
              <AccordionItem value="a">
                <AccordionTrigger>Risk settings</AccordionTrigger>
                <AccordionPanel>Max position 5% of equity.</AccordionPanel>
              </AccordionItem>
            </Accordion>
          ),
        },
        {
          id: "disabled",
          label: "Disabled",
          content: (
            <Accordion className="max-w-sm">
              <AccordionItem value="a" disabled>
                <AccordionTrigger>Live trading</AccordionTrigger>
                <AccordionPanel>Not available yet.</AccordionPanel>
              </AccordionItem>
            </Accordion>
          ),
        },
      ]}
    >
      {() => (
        <Accordion className="max-w-sm">
          <AccordionItem value="a">
            <AccordionTrigger>Risk settings</AccordionTrigger>
            <AccordionPanel>Max position 5% of equity.</AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
    </StateGrid>
  ),
};
