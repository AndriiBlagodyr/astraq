import createClient from "openapi-fetch";
import type { paths } from "./schema";

/**
 * A typed client for the Veracand API. Paths, params, and response bodies
 * all come from the generated `schema.ts`, so a contract change shows up as
 * a type error in the caller.
 */
export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}

export type ApiClient = ReturnType<typeof createApiClient>;
export type { components, operations, paths } from "./schema";
