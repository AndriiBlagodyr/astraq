import { createApiClient } from "@astraq/sdk";
import { env } from "./env";

export type ServiceHealth = {
  name: string;
  url: string;
  status: "up" | "down";
  /** HTTP status, or the reason no response arrived. */
  detail: string;
  latencyMs: number | null;
  /** The commit the service reports it was built from, when it does. */
  version: string | null;
};

const TIMEOUT_MS = 2_000;

const api = createApiClient(env.API_URL);

type Init = Pick<RequestInit, "cache" | "signal">;
type Probe = (
  url: string,
  init: Init
) => Promise<{ response: Response; version: string | null }>;

const services: Array<{ name: string; url: string; probe: Probe }> = [
  {
    name: "API",
    url: new URL("/health/ready", env.API_URL).toString(),
    // Through the generated SDK: the first web → api call on the contract.
    probe: async (_url, init) => {
      const { data, response } = await api.GET("/health/ready", init);
      return { response, version: data?.version ?? null };
    },
  },
  {
    // The ML service isn't part of the OpenAPI contract, so plain fetch.
    name: "ML service",
    url: new URL("/health", env.ML_URL).toString(),
    probe: async (url, init) => ({
      response: await fetch(url, init),
      version: null,
    }),
  },
];

async function check(
  name: string,
  url: string,
  probe: Probe
): Promise<ServiceHealth> {
  const started = performance.now();
  try {
    const { response, version } = await probe(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return {
      name,
      url,
      status: response.ok ? "up" : "down",
      detail: `HTTP ${response.status}`,
      latencyMs: Math.round(performance.now() - started),
      version,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      name,
      url,
      status: "down",
      detail: timedOut ? `No response in ${TIMEOUT_MS / 1000}s` : "Unreachable",
      latencyMs: null,
      version: null,
    };
  }
}

export function checkServices() {
  return Promise.all(
    services.map((service) => check(service.name, service.url, service.probe))
  );
}

/** A commit SHA shortened for display, as `git log --oneline` shows it. */
export function shortVersion(version: string | null): string {
  return version ? version.slice(0, 7) : "—";
}
