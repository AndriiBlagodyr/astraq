import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../badge";
import { Table, TableWrap, Td, Th, Tr } from "./table";

const meta = {
  title: "Components/Table",
  parameters: {
    pseudo: { hover: ["#hovered-row"] },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { symbol: "AAPL", price: "$214.05", change: "+2.84%", tone: "positive" },
  { symbol: "NVDA", price: "$181.32", change: "-1.12%", tone: "negative" },
  { symbol: "MSFT", price: "$448.70", change: "+0.41%", tone: "positive" },
] as const;

export const Default: Story = {
  render: () => (
    <TableWrap>
      <Table>
        <caption className="sr-only">Watchlist</caption>
        <thead>
          <Tr>
            <Th>Symbol</Th>
            <Th className="text-right">Price</Th>
            <Th className="text-right">Change</Th>
          </Tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <Tr
              key={row.symbol}
              id={index === 1 ? "hovered-row" : undefined}
              selected={index === 0}
            >
              <Td className="font-semibold text-foreground">{row.symbol}</Td>
              <Td className="text-right">{row.price}</Td>
              <Td className="text-right">
                <Badge tone={row.tone}>{row.change}</Badge>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  ),
  parameters: {
    docs: {
      description: {
        story: "Row 1 is `selected`, row 2 shows the hover state.",
      },
    },
  },
};
