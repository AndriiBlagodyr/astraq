import { z } from "zod";

// The signed-in user's own account (`/api/me`): the profile the Settings
// pages show and the sessions behind "your devices" (docs/ui-plan.md
// § Settings). Email stays read-only until verification exists (Phase 7).

/** A display name: trimmed, one line, up to 80 characters; empty clears it. */
const displayName = z
  .string()
  .trim()
  .max(80, "At most 80 characters")
  .regex(/^[^\u0000-\u001f\u007f]*$/, "One line, no control characters");

/** Body of `GET /api/me`. */
export const AccountSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    /** Null until the user sets one. */
    name: z.string().nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Account" });

/** Body of `PATCH /api/me`. */
export const UpdateAccountBodySchema = z
  .object({ name: displayName })
  .meta({ id: "UpdateAccountBody" });

/** Path of `/api/me/sessions/{id}`. Session ids are UUIDs. */
export const SessionIdParamSchema = z.object({
  id: z.uuid(),
});

/** One signed-in device: a live session of the signed-in user. */
export const AccountSessionSchema = z
  .object({
    id: z.uuid(),
    /** The session the request itself was made with. */
    current: z.boolean(),
    /** As the browser reported it at sign-in; null when it sent none. */
    userAgent: z.string().nullable(),
    ip: z.string().nullable(),
    /** Signed in at, ISO 8601 UTC. */
    createdAt: z.iso.datetime(),
    /** The last token refresh, or the sign-in when none happened yet. */
    lastUsedAt: z.iso.datetime(),
    /** When the session ends for good, whatever happens. */
    expiresAt: z.iso.datetime(),
  })
  .meta({ id: "AccountSession" });

/** Body of `GET /api/me/sessions`, newest first. */
export const AccountSessionListSchema = z
  .object({
    sessions: z.array(AccountSessionSchema),
  })
  .meta({ id: "AccountSessionList" });

export type Account = z.infer<typeof AccountSchema>;
export type UpdateAccountBody = z.infer<typeof UpdateAccountBodySchema>;
export type SessionIdParam = z.infer<typeof SessionIdParamSchema>;
export type AccountSession = z.infer<typeof AccountSessionSchema>;
export type AccountSessionList = z.infer<typeof AccountSessionListSchema>;
