import { z } from "zod";

/** One failed check from request validation. */
export const ValidationIssueSchema = z.object({
  /** Where the bad value sits, e.g. `["query", "from"]`. */
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
});

/**
 * Every error response from the API: an RFC 9457 problem detail. `errors`
 * is present only on validation failures (400).
 */
export const ProblemSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string().optional(),
    instance: z.string(),
    timestamp: z.iso.datetime(),
    errors: z.array(ValidationIssueSchema).optional(),
  })
  .meta({ id: "Problem" });

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type Problem = z.infer<typeof ProblemSchema>;
