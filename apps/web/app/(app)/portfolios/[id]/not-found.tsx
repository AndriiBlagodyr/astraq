import Link from "next/link";
import { Card, EmptyState, buttonVariants } from "@astraq/ui";

export default function PortfolioNotFound() {
  return (
    <main className="grid gap-5">
      <Card className="p-7">
        <EmptyState
          title="No such portfolio"
          description="The link may be mistyped, or it belongs to another account."
          action={
            <Link href="/portfolios?all" className={buttonVariants()}>
              Your portfolios
            </Link>
          }
        />
      </Card>
    </main>
  );
}
