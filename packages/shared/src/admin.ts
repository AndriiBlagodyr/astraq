import { z } from "zod";

// The operator's view of the system (`/api/admin/*`): the market data job
// queue for now. Only the users named in the api's ADMIN_EMAILS get it.

/** One job, in whichever list it is in. */
export const QueueJobSchema = z
  .object({
    id: z.string(),
    /** The kind of job: `eod-refresh`, `session-close`, and so on. */
    name: z.string(),
    /** Its payload, as it was enqueued. */
    data: z.record(z.string(), z.unknown()),
    /** How many times it has been tried. */
    attempts: z.number().int().nonnegative(),
    /** How many tries it gets before it is given up on. */
    maxAttempts: z.number().int().positive(),
    /** Why its last try failed; null when none has. */
    error: z.string().nullable(),
    /**
     * When it runs (a delayed job), started (an active one), or was given
     * up on (a failed or dead-lettered one).
     */
    at: z.iso.datetime().nullable(),
  })
  .meta({ id: "QueueJob" });

export const QueueCountsSchema = z
  .object({
    waiting: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    /** Scheduled for later, or waiting out a retry's backoff. */
    delayed: z.number().int().nonnegative(),
    /** Waiting for other jobs to be over (the check after a refresh). */
    waitingChildren: z.number().int().nonnegative(),
    /** Done, and still kept (a week). */
    completed: z.number().int().nonnegative(),
    /** Given up on, and still kept (a month). */
    failed: z.number().int().nonnegative(),
    /** Given up on and not yet looked at: the dead-letter queue. */
    dead: z.number().int().nonnegative(),
  })
  .meta({ id: "QueueCounts" });

/** Body of `GET /api/admin/queue`. Each list is capped; the counts are not. */
export const QueueStatusSchema = z
  .object({
    queue: z.string(),
    asOf: z.iso.datetime(),
    counts: QueueCountsSchema,
    /** Running now. */
    active: z.array(QueueJobSchema),
    /** The next to run, soonest first. */
    delayed: z.array(QueueJobSchema),
    /** The most recently given up on, newest first. */
    failed: z.array(QueueJobSchema),
    /** The dead letters, oldest first. */
    dead: z.array(QueueJobSchema),
  })
  .meta({ id: "QueueStatus" });

/** Body of `POST /api/admin/queue/dead/retry`. */
export const RetryDeadResultSchema = z
  .object({
    /** How many dead letters went back on the queue. */
    retried: z.number().int().nonnegative(),
  })
  .meta({ id: "RetryDeadResult" });

export type QueueJob = z.infer<typeof QueueJobSchema>;
export type QueueCounts = z.infer<typeof QueueCountsSchema>;
export type QueueStatus = z.infer<typeof QueueStatusSchema>;
export type RetryDeadResult = z.infer<typeof RetryDeadResultSchema>;
