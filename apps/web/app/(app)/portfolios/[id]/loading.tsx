import { Card, Skeleton } from "@astraq/ui";

export default function PortfolioLoading() {
  return (
    <main
      className="grid gap-5"
      aria-busy="true"
      aria-label="Loading portfolio"
    >
      <Card className="grid gap-3 p-7">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </Card>
      <Card className="grid gap-6 p-7">
        <Skeleton className="h-16 w-56" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-6">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </Card>
      <Card className="grid gap-3 p-7">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-7 w-full" />
        ))}
      </Card>
    </main>
  );
}
