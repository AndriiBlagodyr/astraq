import { Card, Skeleton } from "@astraq/ui";

export default function StockLoading() {
  return (
    <main className="grid gap-5" aria-busy="true" aria-label="Loading chart">
      <Card className="grid gap-3 p-7">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-7 w-48" />
      </Card>
      <Card className="grid gap-4 p-5 sm:p-7">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[26rem] w-full sm:h-[32rem]" />
      </Card>
    </main>
  );
}
