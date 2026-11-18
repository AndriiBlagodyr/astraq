import { Card, Skeleton } from "@astraq/ui";

export default function PortfoliosLoading() {
  return (
    <main
      className="grid gap-5"
      aria-busy="true"
      aria-label="Loading portfolios"
    >
      <Card className="grid gap-4 p-7">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </Card>
      <Card className="grid gap-3 p-7">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </Card>
    </main>
  );
}
