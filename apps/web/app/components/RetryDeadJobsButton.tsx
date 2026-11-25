"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Button, useToastManager } from "@astraq/ui";
import { retryDeadJobs } from "@/app/(app)/admin/actions";

/**
 * Puts the dead-lettered jobs back on the queue (the `jobs retry-dead`
 * command as a button). Nothing is lost by it: a job that fails again is
 * dead-lettered again, so it doesn't ask first.
 */
export function RetryDeadJobsButton({ count }: { count: number }) {
  const toast = useToastManager();
  const [pending, startTransition] = useTransition();

  function retry() {
    startTransition(async () => {
      const result = await retryDeadJobs();
      if (!result.ok) {
        toast.add({
          title: "Couldn't put the jobs back",
          description: result.error,
          type: "danger",
          priority: "high",
        });
        return;
      }
      toast.add({
        title:
          result.value === 1
            ? "1 job is back on the queue"
            : `${result.value} jobs are back on the queue`,
        description: "The worker tries each again, with all its attempts.",
      });
    });
  }

  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={retry}>
      <RotateCcw aria-hidden="true" />
      {count === 1 ? "Try it again" : `Try all ${count} again`}
    </Button>
  );
}
