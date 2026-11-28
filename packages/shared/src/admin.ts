import { z } from "zod";
import { emailAddress, oneLineName } from "./primitives";

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

// Review access (`/api/admin/access`, ROADMAP "Review access" side track):
// a sign-in an admin makes for a company, with an end date and a switch.

/** Open, past its end date, or closed by an admin. Closed wins over past. */
export const ReviewAccessStateSchema = z
  .enum(["active", "expired", "revoked"])
  .meta({ id: "ReviewAccessState" });

/** One review account. Its id is the id of the user it signs in as. */
export const ReviewAccessSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    company: z.string(),
    /** The admin's own note; null when none was written. */
    note: z.string().nullable(),
    state: ReviewAccessStateSchema,
    /** Sign-in and refresh stop working at this time. */
    expiresAt: z.iso.datetime(),
    /** When an admin closed it; null while it hasn't been. */
    revokedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    /** Several people use the one sign-in, so its password can't be changed. */
    sharedCredentials: z.boolean(),
    /** The next sign-in can do nothing until it has set a new password. */
    mustChangePassword: z.boolean(),
    /** When the password an admin handed out was replaced; null until then. */
    passwordChangedAt: z.iso.datetime().nullable(),
    /** The latest sign-in; null when nobody has signed in yet. */
    lastSignInAt: z.iso.datetime().nullable(),
  })
  .meta({ id: "ReviewAccess" });

/** Body of `GET /api/admin/access`, newest first. */
export const ReviewAccessListSchema = z
  .object({ accounts: z.array(ReviewAccessSchema) })
  .meta({ id: "ReviewAccessList" });

/** Body of `POST /api/admin/access`. */
export const CreateReviewAccessBodySchema = z
  .object({
    email: emailAddress,
    company: oneLineName(120),
    /** Empty for none. */
    note: z.string().trim().max(500, "At most 500 characters"),
    expiresAt: z.iso.datetime(),
    sharedCredentials: z.boolean(),
  })
  .meta({ id: "CreateReviewAccessBody" });

/**
 * Body of `PATCH /api/admin/access/{id}`: a new end date. It also reopens
 * an account that was closed.
 */
export const UpdateReviewAccessBodySchema = z
  .object({ expiresAt: z.iso.datetime() })
  .meta({ id: "UpdateReviewAccessBody" });

/** Path of `/api/admin/access/{id}`. */
export const ReviewAccessIdParamSchema = z.object({ id: z.uuid() });

/**
 * An account together with its password, which exists in readable form
 * only in this answer: after creating one, and after a password reset.
 */
export const ReviewAccessCredentialsSchema = z
  .object({ account: ReviewAccessSchema, password: z.string() })
  .meta({ id: "ReviewAccessCredentials" });

export type QueueJob = z.infer<typeof QueueJobSchema>;
export type QueueCounts = z.infer<typeof QueueCountsSchema>;
export type QueueStatus = z.infer<typeof QueueStatusSchema>;
export type RetryDeadResult = z.infer<typeof RetryDeadResultSchema>;
export type ReviewAccessState = z.infer<typeof ReviewAccessStateSchema>;
export type ReviewAccess = z.infer<typeof ReviewAccessSchema>;
export type ReviewAccessList = z.infer<typeof ReviewAccessListSchema>;
export type CreateReviewAccessBody = z.infer<typeof CreateReviewAccessBodySchema>;
export type UpdateReviewAccessBody = z.infer<typeof UpdateReviewAccessBodySchema>;
export type ReviewAccessIdParam = z.infer<typeof ReviewAccessIdParamSchema>;
export type ReviewAccessCredentials = z.infer<typeof ReviewAccessCredentialsSchema>;
