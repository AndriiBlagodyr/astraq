import { Card, Skeleton } from "@astraq/ui";

// Today and Status while their data loads (docs/motion-and-delight-plan.md:
// route loading states use Skeleton). The stock routes have their own,
// shaped like their content.
export default function AppLoading() {
  return (
    <main className="grid gap-5" aria-busy="true" aria-label="Loading">
      <Card className="grid gap-4 p-7">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </Card>
      <Card className="grid gap-3 p-7">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </Card>
    </main>
  );
}
