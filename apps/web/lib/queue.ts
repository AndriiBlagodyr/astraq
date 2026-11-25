import type { components } from "@astraq/sdk";

// The job queue as /admin/queue and /status word it (docs/ui-plan.md
// § Status, roadmap Phase 4 item 8). Pure: the read is in lib/queue-api.ts,
// which needs the request's cookies. Tested in queue.test.ts.

export type QueueStatus = components["schemas"]["QueueStatus_Output"];
export type QueueJob = components["schemas"]["QueueJob_Output"];

export type QueueSummary = {
  tone: "positive" | "negative" | "warning" | "neutral";
  label: string;
  /** One sentence under the badge. */
  detail: string;
};

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/**
 * The queue as one badge and a sentence. A dead letter is the only thing
 * that needs a person: a job waiting out a retry is the queue working, and
 * a failed job that isn't dead-lettered can't happen (the worker writes the
 * dead letter first), so it reads as a warning rather than an error.
 */
export function queueSummary(status: QueueStatus): QueueSummary {
  const { counts } = status;
  const retrying = status.delayed.filter((job) => job.attempts > 0).length;
  const busy = counts.waiting + counts.active + counts.waitingChildren;
  const work =
    busy === 0
      ? "Nothing is running."
      : `${plural(counts.active, "job", "jobs")} running, ${counts.waiting + counts.waitingChildren} waiting.`;
  const next = status.delayed.find((job) => job.attempts === 0);
  const scheduled = next ? ` Next scheduled: ${jobTitle(next)}.` : "";

  if (counts.dead > 0) {
    return {
      tone: "negative",
      label: plural(counts.dead, "job given up on", "jobs given up on"),
      detail: `${work} Each was tried until a retry couldn't help; the cause is in its error.`,
    };
  }
  if (retrying > 0) {
    return {
      tone: "warning",
      label: plural(retrying, "job retrying", "jobs retrying"),
      detail: `${work} A failed try waits and runs again, for about an hour.${scheduled}`,
    };
  }
  if (next === undefined && busy === 0) {
    return {
      tone: "warning",
      label: "Nothing scheduled",
      detail:
        "No refresh is waiting for the next close: the worker schedules one when it starts, so it may never have run.",
    };
  }
  return { tone: "positive", label: "Healthy", detail: work + scheduled };
}

const TICKERS_SHOWN = 4;

/** A job's payload in a few words: its tickers and range, or its session. */
export function describePayload(data: QueueJob["data"]): string {
  const parts: string[] = [];
  if (typeof data.ticker === "string") parts.push(data.ticker);
  if (Array.isArray(data.tickers)) {
    const tickers = data.tickers.filter(
      (ticker): ticker is string => typeof ticker === "string"
    );
    const shown = tickers.slice(0, TICKERS_SHOWN).join(", ");
    parts.push(
      tickers.length > TICKERS_SHOWN
        ? `${shown} and ${tickers.length - TICKERS_SHOWN} more`
        : shown
    );
  }
  if (typeof data.from === "string" && typeof data.to === "string") {
    parts.push(data.from === data.to ? data.to : `${data.from} to ${data.to}`);
  }
  if (typeof data.session === "string") parts.push(`session ${data.session}`);
  // A payload this doesn't know is shown whole rather than not at all.
  return parts.length > 0 ? parts.join(" · ") : JSON.stringify(data);
}

const JOB_NAMES: Record<string, string> = {
  "symbol-backfill": "Backfill",
  "eod-refresh": "Bars refresh",
  "corporate-actions-refresh": "Corporate actions refresh",
  "session-close": "After-close refresh",
  "data-quality-check": "Data quality check",
};

/** "Bars refresh · AAPL, NVDA · 2026-11-20 to 2026-11-24". */
export function jobTitle(job: QueueJob): string {
  return `${JOB_NAMES[job.name] ?? job.name} · ${describePayload(job.data)}`;
}

/** "Try 3 of 8", or null for a job that hasn't been tried. */
export function attemptText(job: QueueJob): string | null {
  if (job.attempts === 0) return null;
  return `Try ${job.attempts} of ${job.maxAttempts}`;
}
