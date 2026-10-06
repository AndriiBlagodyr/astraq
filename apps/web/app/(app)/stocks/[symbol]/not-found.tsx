import Link from "next/link";
import { Card, EmptyState, buttonVariants } from "@astraq/ui";

export default function StockNotFound() {
  return (
    <main className="grid gap-5">
      <Card className="p-7">
        <EmptyState
          title="Unknown symbol"
          description="Veracand has no data for this ticker. Only the symbols loaded so far have pages."
          action={
            <Link href="/stocks" className={buttonVariants()}>
              Search stocks
            </Link>
          }
        />
      </Card>
    </main>
  );
}
