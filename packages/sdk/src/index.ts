import createClient, { type ClientOptions } from "openapi-fetch";
import type { paths } from "./schema";

/**
 * A typed client for the Veracand API. Paths, params, and response bodies
 * all come from the generated `schema.ts`, so a contract change shows up as
 * a type error in the caller. `options` are openapi-fetch's, for headers
 * every request should carry (the web's BFF sets the user's Bearer token).
 */
export function createApiClient(
  baseUrl: string,
  options: Omit<ClientOptions, "baseUrl"> = {},
) {
  return createClient<paths>({ ...options, baseUrl });
}

export type ApiClient = ReturnType<typeof createApiClient>;
export type { components, operations, paths } from "./schema";
