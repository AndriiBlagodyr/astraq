import { Card, Skeleton } from "@astraq/ui";

export default function ReturnsLoading() {
  return (
    <main
      className="grid gap-5"
      aria-busy="true"
      aria-label="Loading returns distribution"
    >
      <Card className="grid gap-3 p-7">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </Card>
      <Card className="grid gap-4 p-5 sm:p-7">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Skeleton className="aspect-[2/1] w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </Card>
    </main>
  );
}
