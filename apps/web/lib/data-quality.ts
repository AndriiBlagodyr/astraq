import type { components } from "@astraq/sdk";
import { api } from "./api";

// The data quality section of /status (docs/ui-plan.md § Status, Phase 4).
// The api's worker checks the stored daily bars after each session's
// refresh; this reads the latest check and puts it into words.

export type DataQualityReport =
  components["schemas"]["DataQualityReport_Output"];
export type DataQualityCheck = components["schemas"]["DataQualityCheck_Output"];
type CheckName = DataQualityCheck["check"];

const TIMEOUT_MS = 2_000;

/**
 * The latest check, or null when the api didn't answer: /status has to
 * render while the api is down, which is when it is opened.
 */
export async function getDataQuality(): Promise<DataQualityReport | null> {
  try {
    const { data } = await api.GET("/api/market/data-quality", {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export const CHECK_TEXT: Record<CheckName, { name: string; what: string }> = {
  missing_sessions: {
    name: "Missing sessions",
    what: "A day the exchange traded, inside a symbol's history, without a bar.",
  },
  duplicate_bars: {
    name: "Duplicate bars",
    what: "A session stored twice, or a bar that copies the one before it.",
  },
  ohlc_sanity: {
    name: "Price sanity",
    what: "Low at or under the open and close, high at or over them, prices above zero.",
  },
  stale_symbols: {
    name: "Stale symbols",
    what: "A symbol whose bars stop before the last session that closed.",
  },
};

export const CHECK_STATUS = {
  passed: { tone: "positive", text: "Passed" },
  failed: { tone: "negative", text: "Failed" },
  skipped: { tone: "neutral", text: "Not checked" },
} as const satisfies Record<
  DataQualityCheck["status"],
  { tone: string; text: string }
>;

export type DataQualitySummary = {
  tone: "positive" | "negative" | "warning" | "neutral";
  label: string;
  /** One or two sentences under the badge. */
  detail: string;
};

/** The whole report as one badge and a line of text. */
export function dataQualitySummary(
  report: DataQualityReport | null
): DataQualitySummary {
  if (report === null) {
    return {
      tone: "neutral",
      label: "Unavailable",
      detail: "The api didn't answer, so the last check can't be shown.",
    };
  }
  const { run } = report;
  if (run === null) {
    return {
      tone: "neutral",
      label: "Not checked yet",
      detail:
        "The worker checks the stored bars after each session's refresh. No check has run.",
    };
  }
  const found = run.checks.reduce((sum, check) => sum + check.count, 0);
  const checked =
    `Checked ${run.checkedAt.slice(0, 16).replace("T", " ")} UTC ` +
    `for the session of ${run.session}, ${run.symbols} ` +
    (run.symbols === 1 ? "symbol." : "symbols.");
  // A late check is said either way: old findings may be fixed, old passes
  // may not hold.
  const late = report.current
    ? ""
    : ` The session of ${report.expectedSession} hasn't been checked: its refresh didn't finish, or didn't run.`;
  if (found > 0) {
    return {
      tone: "negative",
      label: found === 1 ? "1 problem" : `${found} problems`,
      detail: checked + late,
    };
  }
  return report.current
    ? { tone: "positive", label: "All checks passed", detail: checked }
    : { tone: "warning", label: "Check overdue", detail: checked + late };
}
