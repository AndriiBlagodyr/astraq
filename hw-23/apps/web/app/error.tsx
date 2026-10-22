"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@astraq/ui";
import { StatusPanel } from "@/app/components/StatusPanel";

type ErrorProps = {
  error: Error & { digest?: string };
  /** Re-fetches the server component, unlike `reset` (Next.js 16). */
  unstable_retry: () => void;
};

export default function Error({ error, unstable_retry }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPanel
      eyebrow="Application error"
      title="Something went wrong"
      description="This page hit an unexpected error. Try again, or check whether a service is down."
    >
      <Button onClick={() => unstable_retry()}>Try again</Button>
      <Link href="/status" className={buttonVariants({ variant: "secondary" })}>
        Status
      </Link>
    </StatusPanel>
  );
}
