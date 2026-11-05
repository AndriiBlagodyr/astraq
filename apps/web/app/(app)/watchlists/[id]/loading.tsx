import { Card, Skeleton } from "@astraq/ui";

export default function WatchlistLoading() {
  return (
    <main
      className="grid gap-5"
      aria-busy="true"
      aria-label="Loading watchlist"
    >
      <Card className="grid gap-3 p-7">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-64" />
      </Card>
      <Card className="grid gap-4 p-7">
        <Skeleton className="h-10 w-full max-w-sm" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-7 w-full" />
        ))}
      </Card>
    </main>
  );
}
