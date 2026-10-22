"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, Card, EmptyState, buttonVariants } from "@astraq/ui";

type StockErrorProps = {
  error: Error & { digest?: string };
  /** Re-fetches the server component, unlike `reset` (Next.js 16). */
  unstable_retry: () => void;
};

export default function StockError({ error, unstable_retry }: StockErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid gap-5">
      <Card className="p-7">
        <EmptyState
          title="The chart couldn't load"
          description="The API didn't return candles for this symbol. It may be down; Status shows which service."
          action={
            <>
              <Button onClick={() => unstable_retry()}>Try again</Button>
              <Link
                href="/status"
                className={buttonVariants({ variant: "secondary" })}
              >
                Status
              </Link>
            </>
          }
        />
      </Card>
    </main>
  );
}
