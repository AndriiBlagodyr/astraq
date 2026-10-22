import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../badge";
import {
  Table,
  TableCaption,
  TableSortButton,
  TableWrap,
  Tbody,
  Td,
  Tfoot,
  Th,
  Thead,
  Tr,
} from "./table";

const meta = {
  title: "Components/Table",
  parameters: {
    pseudo: { hover: ["#hovered-row"] },
    docs: {
      description: {
        component:
          "Plain, RSC-safe table parts. Padding follows the density tokens, so `data-density=\"compact\"` on the TableWrap (or any ancestor) tightens one table. `align=\"end\"` right-aligns numbers. For sorting, selection and thousands of rows, use the DataTable recipe.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { symbol: "AAPL", price: "$214.05", change: "+2.84%", tone: "positive", volume: "52.1M" },
  { symbol: "NVDA", price: "$181.32", change: "-1.12%", tone: "negative", volume: "198.4M" },
  { symbol: "MSFT", price: "$448.70", change: "+0.41%", tone: "positive", volume: "18.9M" },
  { symbol: "AMZN", price: "$227.15", change: "+1.06%", tone: "positive", volume: "41.3M" },
] as const;

function Watchlist({ caption = "Watchlist" }: { caption?: string }) {
  return (
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <Thead>
        <Tr>
          <Th>Symbol</Th>
          <Th align="end">Price</Th>
          <Th align="end">Change</Th>
          <Th align="end">Volume</Th>
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((row, index) => (
          <Tr key={row.symbol} id={index === 1 ? "hovered-row" : undefined} selected={index === 0}>
            <Td className="font-semibold text-foreground">{row.symbol}</Td>
            <Td align="end">{row.price}</Td>
            <Td align="end">
              <Badge tone={row.tone}>{row.change}</Badge>
            </Td>
            <Td align="end">{row.volume}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

export const Default: Story = {
  render: () => (
    <TableWrap>
      <Watchlist />
    </TableWrap>
  ),
  parameters: {
    docs: { description: { story: "Row 1 is `selected`, row 2 shows the hover state." } },
  },
};

export const Density: Story = {
  render: () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <TableWrap data-density="comfortable">
        <Watchlist caption="Comfortable" />
      </TableWrap>
      <TableWrap data-density="compact">
        <Watchlist caption="Compact" />
      </TableWrap>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "The same table under each density, set on the wrap. Without it, the theme or the toolbar's density applies.",
      },
    },
  },
};

const fills = Array.from({ length: 40 }, (_, index) => {
  const side = index % 3 === 0 ? "Sell" : "Buy";
  const qty = 10 + ((index * 37) % 190);
  const price = 180 + ((index * 53) % 400) / 10;
  return {
    id: `F-${1040 + index}`,
    time: `14:${String(59 - index).padStart(2, "0")}:0${index % 10}`,
    side,
    qty,
    price: price.toFixed(2),
  };
});

export const StickyHeader: Story = {
  render: () => (
    <TableWrap scroll role="region" aria-label="Fills" className="h-80 max-w-2xl">
      <Table sticky>
        <TableCaption className="sr-only">Fills</TableCaption>
        <Thead>
          <Tr>
            <Th>Fill</Th>
            <Th>Time</Th>
            <Th>Side</Th>
            <Th align="end">Qty</Th>
            <Th align="end">Price</Th>
          </Tr>
        </Thead>
        <Tbody>
          {fills.map((fill) => (
            <Tr key={fill.id}>
              <Td className="font-mono text-xs">{fill.id}</Td>
              <Td>{fill.time}</Td>
              <Td className={fill.side === "Buy" ? "text-positive-fg" : "text-negative-fg"}>{fill.side}</Td>
              <Td align="end">{fill.qty}</Td>
              <Td align="end">{fill.price}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableWrap>
  ),
  parameters: {
    docs: {
      description: {
        story: "`TableWrap scroll` makes the wrap the scroll container; `Table sticky` pins the header to it. On glass themes the header blurs what scrolls under it.",
      },
    },
  },
};

type SortKey = "symbol" | "price";

export const Sortable: Story = {
  render: function Render() {
    const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "symbol", desc: false });
    const sorted = [...rows].sort((a, b) => {
      const order =
        sort.key === "price"
          ? Number(a.price.slice(1)) - Number(b.price.slice(1))
          : a.symbol.localeCompare(b.symbol);
      return sort.desc ? -order : order;
    });
    const toggle = (key: SortKey) =>
      setSort((current) => ({ key, desc: current.key === key ? !current.desc : false }));
    const ariaSort = (key: SortKey) =>
      sort.key === key ? (sort.desc ? "descending" : "ascending") : "none";
    const direction = (key: SortKey) => (sort.key === key ? (sort.desc ? "desc" : "asc") : false);

    return (
      <TableWrap>
        <Table>
          <TableCaption className="sr-only">Sortable watchlist</TableCaption>
          <Thead>
            <Tr>
              <Th sort={ariaSort("symbol")}>
                <TableSortButton direction={direction("symbol")} onClick={() => toggle("symbol")}>
                  Symbol
                </TableSortButton>
              </Th>
              <Th align="end" sort={ariaSort("price")}>
                <TableSortButton direction={direction("price")} onClick={() => toggle("price")}>
                  Price
                </TableSortButton>
              </Th>
              <Th align="end">Change</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sorted.map((row) => (
              <Tr key={row.symbol}>
                <Td className="font-semibold text-foreground">{row.symbol}</Td>
                <Td align="end">{row.price}</Td>
                <Td align="end">
                  <Badge tone={row.tone}>{row.change}</Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableWrap>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "`Th sort` sets `aria-sort`; `TableSortButton` is the control inside it and fills the header cell. The table parts stay presentational: you own the sort, here or on the server.",
      },
    },
  },
};

export const WithFooter: Story = {
  render: () => (
    <TableWrap className="max-w-md">
      <Table>
        <TableCaption>Positions</TableCaption>
        <Thead>
          <Tr>
            <Th>Symbol</Th>
            <Th align="end">Market value</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>AAPL</Td>
            <Td align="end">$10,702.50</Td>
          </Tr>
          <Tr>
            <Td>MSFT</Td>
            <Td align="end">$8,974.00</Td>
          </Tr>
        </Tbody>
        <Tfoot>
          <Tr>
            <Td>Total</Td>
            <Td align="end">$19,676.50</Td>
          </Tr>
        </Tfoot>
      </Table>
    </TableWrap>
  ),
};
