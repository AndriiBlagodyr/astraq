import { env } from "./env";

export type ServiceHealth = {
  name: string;
  url: string;
  status: "up" | "down";
  /** HTTP status, or the reason no response arrived. */
  detail: string;
  latencyMs: number | null;
};

const TIMEOUT_MS = 2_000;

const services = [
  { name: "API", url: new URL("/health/ready", env.API_URL).toString() },
  { name: "ML service", url: new URL("/health", env.ML_URL).toString() },
];

async function check(name: string, url: string): Promise<ServiceHealth> {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return {
      name,
      url,
      status: response.ok ? "up" : "down",
      detail: `HTTP ${response.status}`,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      name,
      url,
      status: "down",
      detail: timedOut ? `No response in ${TIMEOUT_MS / 1000}s` : "Unreachable",
      latencyMs: null,
    };
  }
}

export function checkServices() {
  return Promise.all(services.map((service) => check(service.name, service.url)));
}
