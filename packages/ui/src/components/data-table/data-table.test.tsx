import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, createDataTableColumnHelper, useDataTable } from "./data-table";

// TanStack Table v9 spreads options over each feature's defaults, so passing
// `onSortingChange: undefined` erases the internal updater: headers render
// as sortable and clicks do nothing, with no error.
type Row = { symbol: string; price: number };
const helper = createDataTableColumnHelper<Row>();
const columns = helper.columns([
  helper.accessor("symbol", { header: "Symbol" }),
  helper.accessor("price", { header: "Price" }),
]);
const data: Row[] = [
  { symbol: "MSFT", price: 448 },
  { symbol: "AAPL", price: 214 },
];

function Harness() {
  const table = useDataTable({ data, columns, getRowId: (row) => row.symbol, enableRowSelection: true });
  return (
    <>
      <output data-testid="state">
        {JSON.stringify({ sorting: table.state.sorting, selected: Object.keys(table.state.rowSelection) })}
      </output>
      <DataTable table={table} label="Quotes" />
    </>
  );
}

describe("useDataTable", () => {
  it("keeps internal state working when no handlers are passed", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Symbol" }));
    expect(screen.getByRole("columnheader", { name: "Symbol" })).toHaveAttribute("aria-sort", "ascending");

    await user.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(JSON.parse(screen.getByTestId("state").textContent!)).toEqual({
      sorting: [{ id: "symbol", desc: false }],
      selected: ["MSFT", "AAPL"],
    });
  });
});
