import Link from "next/link";
import { Card, EmptyState, buttonVariants } from "@astraq/ui";

export default function WatchlistNotFound() {
  return (
    <main className="grid gap-5">
      <Card className="p-7">
        <EmptyState
          title="No such watchlist"
          description="It may have been deleted, or the link belongs to another account."
          action={
            <Link href="/watchlists" className={buttonVariants()}>
              Your watchlists
            </Link>
          }
        />
      </Card>
    </main>
  );
}
