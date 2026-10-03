"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@astraq/ui";
import { StatusPanel } from "@/app/components/StatusPanel";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPanel
      eyebrow="Application error"
      title="Something went wrong"
      description="This page hit an unexpected error. Try again, or check whether a service is down."
    >
      <Button onClick={() => reset()}>Try again</Button>
      <Link href="/status" className={buttonVariants({ variant: "secondary" })}>
        Status
      </Link>
    </StatusPanel>
  );
}
