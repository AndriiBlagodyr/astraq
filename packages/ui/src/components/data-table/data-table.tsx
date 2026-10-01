"use client";

import { useRef, type ReactNode } from "react";
import {
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ColumnHelper,
  type ColumnVisibilityState,
  type Header,
  type OnChangeFn,
  type ReactTable,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Columns3 } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Menu, MenuCheckboxItem, MenuContent, MenuGroup, MenuGroupLabel, MenuTrigger } from "../menu";
import {
  Table,
  TableSortButton,
  TableWrap,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  type TableAlign,
} from "../table";

// A recipe, not a grid widget: TanStack Table owns sorting, selection and
// column visibility; TanStack Virtual renders only the rows in view. The
// markup stays a plain <table>, so it reads as a table, not an ARIA grid,
// and Tab moves through its interactive cells (sort buttons, checkboxes).

export type DataTableColumnMeta = {
  /** `end` for numbers, so digits line up. @default "start" */
  align?: TableAlign;
  /** Names the column in the column menu when `header` isn't a string. */
  label?: string;
};

// Only what the recipe uses is registered, so the rest of TanStack Table
// (filtering, pagination, grouping, ...) stays out of the bundle. Built-in
// sort names, including `sortFn: "auto"`, resolve only against this registry.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  rowSelectionFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof features;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns mix value types
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData, any>;
export type DataTableInstance<TData extends RowData> = ReactTable<DataTableFeatures, TData>;
export type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>;
export type { ColumnVisibilityState, RowSelectionState, SortingState };

/** A typed column builder: `helper.accessor("price", { header: "Price" })`. */
export function createDataTableColumnHelper<TData extends RowData>(): ColumnHelper<DataTableFeatures, TData> {
  return createColumnHelper<DataTableFeatures, TData>();
}

export type UseDataTableOptions<TData extends RowData> = {
  /** Keep it stable (state, memo, or query data); a new array resorts every render. */
  data: TData[];
  /** Keep it stable: define columns at module scope or memoize them. */
  columns: DataTableColumn<TData>[];
  /** Selection and React keys follow this id. Defaults to the row index. */
  getRowId?: (row: TData, index: number) => string;
  /**
   * Adds a checkbox column. A function decides per row. Shift+click (or
   * Shift+Space) on a row's box selects the range from the last one.
   */
  enableRowSelection?: boolean | ((row: TData) => boolean);
  /** Sort on the server: sorting state changes, rows keep their order. */
  manualSorting?: boolean;
  /** Starting values for internally owned state. */
  initialState?: {
    sorting?: SortingState;
    rowSelection?: RowSelectionState;
    columnVisibility?: ColumnVisibilityState;
  };
  /** Controlled sorting: pass both or neither. */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** Controlled selection: pass both or neither. */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  /** Controlled column visibility: pass both or neither. */
  columnVisibility?: ColumnVisibilityState;
  onColumnVisibilityChange?: OnChangeFn<ColumnVisibilityState>;
};

const SELECT_COLUMN_ID = "select";

function selectColumn<TData extends RowData>(): DataTableColumn<TData> {
  return {
    id: SELECT_COLUMN_ID,
    size: 52,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows"
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllRowsSelected(checked)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select row ${row.index + 1}`}
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        // TanStack's handler reads `target.checked` and decides on a range
        // from the event, so hand it both.
        onCheckedChange={(checked, details) =>
          row.getToggleSelectedHandler()({
            target: { checked },
            shiftKey: (details.event as { shiftKey?: boolean }).shiftKey ?? false,
          })
        }
      />
    ),
  };
}

/**
 * Builds the table model: sorting, row selection and column visibility. Pass
 * the result to `DataTable` and, for a column picker, `DataTableColumnsMenu`.
 * Each slice is internal unless you pass its value and change handler.
 */
export function useDataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  enableRowSelection = false,
  manualSorting,
  initialState,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,
}: UseDataTableOptions<TData>): DataTableInstance<TData> {
  const withSelection = enableRowSelection !== false;
  const selectable = enableRowSelection;

  // Only controlled slices go in `state`.
  const state: Partial<TableState<DataTableFeatures>> = {};
  if (sorting) state.sorting = sorting;
  if (rowSelection) state.rowSelection = rowSelection;
  if (columnVisibility) state.columnVisibility = columnVisibility;

  // useTable spreads these over each feature's defaults, so a key that is
  // present but undefined erases the default: `onSortingChange: undefined`
  // leaves sorting with no updater. Set only what the caller set.
  const options: TableOptions<DataTableFeatures, TData> = {
    features,
    data,
    columns: withSelection ? withSelectColumn(columns) : columns,
    enableRowSelection:
      typeof selectable === "function"
        ? (row: DataTableRow<TData>) => selectable(row.original)
        : selectable,
    isRowRangeSelectionEvent: (event) => (event as { shiftKey?: boolean }).shiftKey === true,
    ...(getRowId && { getRowId }),
    ...(manualSorting !== undefined && { manualSorting }),
    ...(initialState && { initialState }),
    ...(Object.keys(state).length > 0 && { state }),
    ...(onSortingChange && { onSortingChange }),
    ...(onRowSelectionChange && { onRowSelectionChange }),
    ...(onColumnVisibilityChange && { onColumnVisibilityChange }),
  };

  return useTable(options);
}

// Cached per columns array, so a stable `columns` stays stable with the
// checkbox column added.
const selectColumnCache = new WeakMap<object, unknown>();

function withSelectColumn<TData extends RowData>(columns: DataTableColumn<TData>[]): DataTableColumn<TData>[] {
  const cached = selectColumnCache.get(columns) as DataTableColumn<TData>[] | undefined;
  if (cached) return cached;
  const next = [selectColumn<TData>(), ...columns];
  selectColumnCache.set(columns, next);
  return next;
}

export type DataTableProps<TData extends RowData> = {
  table: DataTableInstance<TData>;
  /** Names the table and its scroll region for assistive tech. */
  label: string;
  /**
   * Classes for the scroll container. Give it a height (`h-96`) or max-height:
   * rows are virtualized against it.
   */
  className?: string;
  /** Shown in place of rows when there are none. */
  empty?: ReactNode;
  /**
   * First guess at a row's height in px, before rows are measured. Close
   * guesses keep the scrollbar steady on first scroll. @default 49
   */
  estimateRowHeight?: number;
  /** Rows rendered beyond each edge of the view. @default 8 */
  overscan?: number;
};

/**
 * Renders a `useDataTable` model as a virtualized, sticky-header table.
 * Headers of sortable columns are buttons (Shift+click adds a column to the
 * sort). Selected rows get the Table's selected tint.
 */
export function DataTable<TData extends RowData>({
  table,
  label,
  className,
  empty = "No results.",
  estimateRowHeight = 49,
  overscan = 8,
}: DataTableProps<TData>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const columnCount = table.getVisibleLeafColumns().length;

  // The header sits inside the scroll element, so item offsets are a header's
  // height off; overscan absorbs it, and spacer rows only use differences.
  // eslint-disable-next-line react-hooks/incompatible-library -- the compiler skips this component, as it should: the virtualizer returns fresh functions each render
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan,
  });

  const items = virtualizer.getVirtualItems();
  const padTop = items.length > 0 ? items[0]!.start : 0;
  const padBottom = items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1]!.end : 0;

  return (
    <TableWrap
      ref={scrollRef}
      scroll
      role="region"
      aria-label={label}
      className={cn("focus-visible:outline-offset-0", className)}
    >
      <Table
        sticky
        aria-label={label}
        // Only rendered rows are in the DOM; these give the true position.
        aria-rowcount={rows.length + 1}
        className="table-fixed"
        style={{ minWidth: table.getTotalSize() }}
      >
        <Thead>
          {table.getHeaderGroups().map((group) => (
            <Tr key={group.id} aria-rowindex={1}>
              {group.headers.map((header) => (
                <HeaderCell key={header.id} table={table} header={header} />
              ))}
            </Tr>
          ))}
        </Thead>
        <Tbody>
          {rows.length === 0 ? (
            <Tr>
              <Td colSpan={columnCount} className="py-12 text-center text-muted">
                {empty}
              </Td>
            </Tr>
          ) : null}
          {padTop > 0 ? <Spacer height={padTop} colSpan={columnCount} /> : null}
          {items.map((item) => {
            const row = rows[item.index]!;
            return (
              <Tr
                key={row.id}
                data-index={item.index}
                ref={virtualizer.measureElement}
                aria-rowindex={item.index + 2}
                selected={row.getIsSelected()}
              >
                {row.getVisibleCells().map((cell) => (
                  <Td
                    key={cell.id}
                    align={cell.column.columnDef.meta?.align}
                    className={
                      // Truncation clips overflow, which would clip the checkbox's focus ring.
                      cell.column.id === SELECT_COLUMN_ID ? "px-inset-sm py-0 align-middle" : "truncate"
                    }
                  >
                    <table.FlexRender cell={cell} />
                  </Td>
                ))}
              </Tr>
            );
          })}
          {padBottom > 0 ? <Spacer height={padBottom} colSpan={columnCount} /> : null}
        </Tbody>
      </Table>
    </TableWrap>
  );
}

function HeaderCell<TData extends RowData>({
  table,
  header,
}: {
  table: DataTableInstance<TData>;
  header: Header<DataTableFeatures, TData, unknown>;
}) {
  const column = header.column;
  const direction = column.getIsSorted();
  const multi = table.state.sorting.length > 1;
  const content = header.isPlaceholder ? null : <table.FlexRender header={header} />;

  return (
    <Th
      colSpan={header.colSpan}
      align={column.columnDef.meta?.align}
      sort={
        column.getCanSort()
          ? direction === "asc"
            ? "ascending"
            : direction === "desc"
              ? "descending"
              : "none"
          : undefined
      }
      className={cn(column.id === SELECT_COLUMN_ID && "px-inset-sm")}
      style={{ width: header.getSize() }}
    >
      {column.getCanSort() && !header.isPlaceholder ? (
        <TableSortButton
          direction={direction}
          index={multi && direction ? column.getSortIndex() + 1 : undefined}
          onClick={column.getToggleSortingHandler()}
        >
          {content}
        </TableSortButton>
      ) : (
        content
      )}
    </Th>
  );
}

function Spacer({ height, colSpan }: { height: number; colSpan: number }) {
  return (
    <tr aria-hidden="true" data-slot="table-spacer">
      <td colSpan={colSpan} style={{ height }} className="border-0 p-0" />
    </tr>
  );
}

export type DataTableColumnsMenuProps<TData extends RowData> = {
  table: DataTableInstance<TData>;
  /** @default "Columns" */
  label?: string;
};

/** A menu of checkboxes that shows and hides the table's hideable columns. */
export function DataTableColumnsMenu<TData extends RowData>({ table, label = "Columns" }: DataTableColumnsMenuProps<TData>) {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());
  return (
    <Menu>
      <MenuTrigger render={<Button variant="secondary" size="sm" />}>
        <Columns3 aria-hidden="true" />
        {label}
      </MenuTrigger>
      <MenuContent align="end">
        <MenuGroup>
          <MenuGroupLabel>Visible columns</MenuGroupLabel>
          {columns.map((column) => {
            const header = column.columnDef.header;
            return (
              <MenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(visible) => column.toggleVisibility(visible)}
                closeOnClick={false}
              >
                {column.columnDef.meta?.label ?? (typeof header === "string" ? header : column.id)}
              </MenuCheckboxItem>
            );
          })}
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
}
