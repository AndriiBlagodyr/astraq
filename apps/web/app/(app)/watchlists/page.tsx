import Link from "next/link";
import {
  Card,
  EmptyState,
  Table,
  TableCaption,
  TableWrap,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@astraq/ui";
import { CreateWatchlistForm } from "@/app/components/CreateWatchlistForm";
import { WatchlistMenu } from "@/app/components/WatchlistMenu";
import { listWatchlists } from "@/lib/watchlists";

export const metadata = {
  title: "Watchlists",
};

const updatedAt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

// The watchlist index (docs/ui-plan.md § Watchlists): every list with its
// symbol count, plus create, rename, and delete with undo. Rendered per
// request for the signed-in user; the rows are links to the detail page.
export default async function WatchlistsPage() {
  const watchlists = await listWatchlists();

  return (
    <main className="grid gap-5">
      <Card className="grid gap-5 p-7">
        <div className="grid gap-2">
          <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
            Watchlists
          </h1>
          <p className="m-0 max-w-2xl leading-7 text-secondary">
            The symbols you follow, grouped your way. Each list shows its last
            closes, day changes, and a sparkline per row.
          </p>
        </div>
        <CreateWatchlistForm />
      </Card>

      {watchlists.length === 0 ? (
        <Card className="p-7">
          <EmptyState
            title="No watchlists yet"
            description="Name one above, then add the symbols you follow. A stock page can add to it too."
          />
        </Card>
      ) : (
        <TableWrap>
          <Table>
            <TableCaption className="sr-only">
              Your watchlists, in your order
            </TableCaption>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th className="text-right">Symbols</Th>
                <Th>Updated</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {watchlists.map((watchlist) => (
                <Tr key={watchlist.id}>
                  <Td>
                    <Link
                      href={`/watchlists/${watchlist.id}`}
                      className="font-semibold text-foreground underline-offset-4 hover:underline"
                    >
                      {watchlist.name}
                    </Link>
                  </Td>
                  <Td className="text-right tabular-nums">
                    {watchlist.symbolCount}
                  </Td>
                  <Td className="text-sm text-muted">
                    <time dateTime={watchlist.updatedAt}>
                      {updatedAt.format(new Date(watchlist.updatedAt))}
                    </time>
                  </Td>
                  <Td className="text-right">
                    <WatchlistMenu id={watchlist.id} name={watchlist.name} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableWrap>
      )}
    </main>
  );
}
