import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../badge";
import { Button } from "../button";
import {
  DataTable,
  DataTableColumnsMenu,
  createDataTableColumnHelper,
  useDataTable,
  type RowSelectionState,
  type SortingState,
} from "./data-table";

const meta = {
  title: "Components/DataTable",
  parameters: {
    docs: {
      description: {
        component:
          "A recipe over TanStack Table and TanStack Virtual: `useDataTable` builds the model (sorting, row selection, column visibility), `DataTable` renders it as a virtualized table with a sticky header, and `DataTableColumnsMenu` shows and hides columns. Shift+click a header to sort by several columns; Shift+click a row's box to select a range. Give the table a height: only rows in view are rendered.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Quote = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  volume: number;
  listed: Date;
};

const SECTORS = ["Technology", "Energy", "Financials", "Health care", "Industrials", "Utilities"];
const NAMES = ["Arcadia", "Borealis", "Cobalt", "Dynamo", "Ember", "Fathom", "Granite", "Halcyon", "Ion", "Juniper"];

// Seeded, so every render and every reviewer sees the same rows.
function makeQuotes(count: number): Quote[] {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, (_, index) => {
    const letters = Array.from({ length: 3 + (index % 2) }, () =>
      String.fromCharCode(65 + Math.floor(random() * 26)),
    ).join("");
    return {
      symbol: `${letters}${index}`,
      name: `${NAMES[index % NAMES.length]} ${["Holdings", "Systems", "Group", "Labs"][index % 4]}`,
      sector: SECTORS[Math.floor(random() * SECTORS.length)]!,
      price: Math.round((5 + random() * 495) * 100) / 100,
      change: Math.round((random() * 10 - 5) * 100) / 100,
      volume: Math.floor(random() * 50_000_000),
      listed: new Date(Date.UTC(1990 + Math.floor(random() * 35), Math.floor(random() * 12), 1)),
    };
  });
}

const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" });

const helper = createDataTableColumnHelper<Quote>();

// Module scope: columns must keep their identity between renders.
const columns = helper.columns([
  helper.accessor("symbol", {
    header: "Symbol",
    size: 110,
    cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
  }),
  helper.accessor("name", { header: "Name", size: 200 }),
  helper.accessor("sector", { header: "Sector", size: 140 }),
  helper.accessor("price", {
    header: "Price",
    size: 110,
    meta: { align: "end" },
    cell: (info) => price.format(info.getValue()),
  }),
  helper.accessor("change", {
    header: "Change",
    size: 110,
    meta: { align: "end" },
    sortDescFirst: true,
    cell: (info) => {
      const value = info.getValue();
      return (
        <Badge tone={value >= 0 ? "positive" : "negative"}>
          {value >= 0 ? "+" : ""}
          {value.toFixed(2)}%
        </Badge>
      );
    },
  }),
  helper.accessor("volume", {
    header: "Volume",
    size: 110,
    meta: { align: "end" },
    sortDescFirst: true,
    cell: (info) => compact.format(info.getValue()),
  }),
  helper.accessor("listed", {
    header: "Listed",
    size: 90,
    meta: { align: "end" },
    sortFn: "datetime",
    cell: (info) => year.format(info.getValue()),
  }),
]);

const quotes = makeQuotes(1_000);

export const Default: Story = {
  render: function Render() {
    const table = useDataTable({
      data: quotes,
      columns,
      getRowId: (row) => row.symbol,
      enableRowSelection: true,
      initialState: { sorting: [{ id: "volume", desc: true }] },
    });
    const selected = Object.keys(table.state.rowSelection).length;

    return (
      <div className="grid max-w-5xl gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-sm text-secondary" aria-live="polite">
            {selected > 0 ? `${selected} of ${quotes.length} selected` : `${quotes.length} symbols`}
          </p>
          <div className="flex gap-2">
            {selected > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => table.resetRowSelection()}>
                Clear selection
              </Button>
            ) : null}
            <DataTableColumnsMenu table={table} />
          </div>
        </div>
        <DataTable table={table} label="Screener results" className="h-[28rem]" />
      </div>
    );
  },
};

const many = makeQuotes(50_000);

export const FiftyThousandRows: Story = {
  render: function Render() {
    const table = useDataTable({ data: many, columns, getRowId: (row) => row.symbol });
    return <DataTable table={table} label="All listed symbols" className="h-[28rem] max-w-5xl" />;
  },
  parameters: {
    docs: {
      description: {
        story: "50,000 rows, with only the ones in view in the DOM. Sorting runs on the full set; `aria-rowcount` and `aria-rowindex` tell screen readers where each rendered row sits.",
      },
    },
  },
};

export const Controlled: Story = {
  render: function Render() {
    const [sorting, setSorting] = useState<SortingState>([{ id: "change", desc: true }]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const table = useDataTable({
      data: quotes,
      columns,
      getRowId: (row) => row.symbol,
      // Only technology names can be added to this basket.
      enableRowSelection: (row) => row.sector === "Technology",
      sorting,
      onSortingChange: setSorting,
      rowSelection,
      onRowSelectionChange: setRowSelection,
      initialState: { columnVisibility: { name: false, listed: false } },
    });

    return (
      <div className="grid max-w-4xl gap-3">
        <pre className="m-0 overflow-x-auto rounded-md bg-surface-muted p-3 text-xs text-secondary">
          {JSON.stringify({ sorting, selected: Object.keys(rowSelection) })}
        </pre>
        <div className="flex justify-end">
          <DataTableColumnsMenu table={table} />
        </div>
        <DataTable table={table} label="Basket builder" className="h-96" />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Sorting and selection held in React state, with a per-row `enableRowSelection` (only Technology rows can be checked). Name and Listed start hidden through `initialState`.",
      },
    },
  },
};

const noQuotes: Quote[] = [];

export const Empty: Story = {
  render: function Render() {
    const table = useDataTable({ data: noQuotes, columns, enableRowSelection: true });
    return (
      <DataTable
        table={table}
        label="Screener results"
        className="h-64 max-w-5xl"
        empty="No symbols match these filters."
      />
    );
  },
};
