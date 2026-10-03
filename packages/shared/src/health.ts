import { z } from "zod";

/** Body of `GET /health/live` and `GET /health/ready`. */
export const HealthStatusSchema = z
  .object({
    status: z.literal("ok"),
  })
  .meta({ id: "HealthStatus" });

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
