import { createApiClient } from "@astraq/sdk";
import { env } from "./env";

/**
 * The web's one client for apps/api, typed by the generated SDK. Server
 * components only: `API_URL` is a server value (see lib/env.ts).
 */
export const api = createApiClient(env.API_URL);
