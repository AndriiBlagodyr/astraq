import { z } from "zod";

/** Body of `GET /health/live` and `GET /health/ready`. */
export const HealthStatusSchema = z
  .object({
    status: z.literal("ok"),
    version: z
      .string()
      .nullable()
      .describe(
        "The git commit the running build came from, or null outside a deploy."
      ),
  })
  .meta({ id: "HealthStatus" });

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
