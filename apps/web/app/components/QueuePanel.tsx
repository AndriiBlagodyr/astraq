import Link from "next/link";
import { Badge, Card } from "@astraq/ui";
import { queueSummary, type QueueStatus } from "@/lib/queue";

/**
 * The job queue on /status, for an admin: one badge for the whole and a
 * link to the jobs themselves.
 */
export function QueuePanel({ status }: { status: QueueStatus }) {
  const summary = queueSummary(status);

  return (
    <section aria-labelledby="queue-heading">
      <Card className="grid gap-3 p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="queue-heading"
            className="m-0 font-display text-xl font-bold tracking-tight text-foreground"
          >
            Jobs
          </h2>
          <Link
            href="/admin/queue"
            className="text-sm text-secondary underline underline-offset-4"
          >
            Open the queue
          </Link>
        </div>
        <p className="m-0 flex flex-wrap items-center gap-3 text-secondary">
          <Badge tone={summary.tone}>{summary.label}</Badge>
          <span>{summary.detail}</span>
        </p>
      </Card>
    </section>
  );
}
