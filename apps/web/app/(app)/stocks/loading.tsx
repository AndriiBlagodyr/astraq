import { Card, Skeleton } from "@astraq/ui";

export default function StocksLoading() {
  return (
    <main className="grid gap-5" aria-busy="true" aria-label="Loading stocks">
      <Card className="grid gap-4 p-7">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-full max-w-xl" />
      </Card>
      <Card className="grid gap-3 p-7">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </Card>
    </main>
  );
}
