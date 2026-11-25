import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Badge, Card, Stat } from "@astraq/ui";
import { LocalTime } from "@/app/components/LocalTime";
import { QueueJobsTable } from "@/app/components/QueueJobsTable";
import { RetryDeadJobsButton } from "@/app/components/RetryDeadJobsButton";
import { getQueueStatus } from "@/lib/queue-api";
import { queueSummary, type QueueJob } from "@/lib/queue";

export const metadata = {
  title: "Job queue",
};

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="grid gap-1">
          <h2 className="m-0 font-display text-xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="m-0 max-w-2xl text-sm leading-6 text-secondary">
            {description}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// The market data job queue, for the people named in the api's ADMIN_EMAILS
// (docs/ui-plan.md § Status, roadmap Phase 4 item 8). Everyone else gets the
// not-found page: the route doesn't say it exists.
export default async function QueuePage() {
  await connection();
  const read = await getQueueStatus();
  if (read.kind === "forbidden") notFound();
  if (read.kind === "unavailable") {
    return (
      <main className="grid gap-5">
        <Card className="grid gap-3 p-7">
          <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
            Job queue
          </h1>
          <p className="m-0 flex flex-wrap items-center gap-3 text-secondary">
            <Badge tone="neutral">Unavailable</Badge>
            <span>
              The api didn&apos;t answer, or it couldn&apos;t reach Redis, where
              the queue lives.
            </span>
          </p>
        </Card>
      </main>
    );
  }

  const { status } = read;
  const { counts } = status;
  const summary = queueSummary(status);
  // A delayed job that has been tried is waiting out a retry's backoff.
  const retrying = status.delayed.filter((job) => job.attempts > 0);
  const scheduled = status.delayed.filter((job) => job.attempts === 0);
  const lists: Array<{
    title: string;
    description: string;
    when: string;
    jobs: QueueJob[];
    total?: number;
  }> = [
    {
      title: "Running",
      description: "What the worker is doing now.",
      when: "Started",
      jobs: status.active,
      total: counts.active,
    },
    {
      title: "Retrying",
      description:
        "A try failed in a way that can pass (the provider was down, or said to slow down). Each waits longer than the last, eight tries over about an hour.",
      when: "Next try",
      jobs: retrying,
    },
    {
      title: "Scheduled",
      description:
        "Each trading day has one job, due half an hour after that day's close. Running it schedules the next.",
      when: "Runs",
      jobs: scheduled,
    },
    {
      title: "Recent failures",
      description:
        "The last jobs that were given up on, newest first, kept for a month. One that was put back and then succeeded is still listed.",
      when: "Failed",
      jobs: status.failed,
      total: counts.failed,
    },
  ];

  return (
    <main className="grid gap-7">
      <Card className="grid gap-5 p-7">
        <div className="grid gap-3">
          <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
            Job queue
          </h1>
          <p className="m-0 flex flex-wrap items-center gap-3 text-secondary">
            <Badge tone={summary.tone}>{summary.label}</Badge>
            <span>{summary.detail}</span>
          </p>
          <p className="m-0 text-sm text-muted">
            Queue <code>{status.queue}</code>, as of{" "}
            <LocalTime value={status.asOf} />. Reload for the latest.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Running" value={String(counts.active)} />
          <Stat
            label="Waiting"
            value={String(counts.waiting + counts.waitingChildren)}
          />
          <Stat label="Later" value={String(counts.delayed)} />
          <Stat label="Done this week" value={String(counts.completed)} />
        </div>
      </Card>

      {status.dead.length > 0 ? (
        <Section
          title="Given up on"
          description="A job lands here when its error is one a retry can't fix (bad keys, an answer in an unexpected shape) or it ran out of tries. Fix the cause, then put them back."
          action={<RetryDeadJobsButton count={counts.dead} />}
        >
          <QueueJobsTable
            caption="Jobs that were given up on"
            when="Given up"
            jobs={status.dead}
          />
          {counts.dead > status.dead.length ? (
            <p className="m-0 px-1 text-sm text-muted">
              The oldest {status.dead.length} of {counts.dead}.
            </p>
          ) : null}
        </Section>
      ) : null}

      {lists.map((list) =>
        list.jobs.length > 0 ? (
          <Section
            key={list.title}
            title={list.title}
            description={list.description}
          >
            <QueueJobsTable
              caption={list.title}
              when={list.when}
              jobs={list.jobs}
            />
            {list.total !== undefined && list.total > list.jobs.length ? (
              <p className="m-0 px-1 text-sm text-muted">
                {list.jobs.length} of {list.total}.
              </p>
            ) : null}
          </Section>
        ) : null
      )}
    </main>
  );
}
