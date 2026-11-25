import { dataQualitySummary, type DataQualityReport } from "./data-quality";

const check = (count: number) => ({
  check: "stale_symbols" as const,
  status: count > 0 ? ("failed" as const) : ("passed" as const),
  count,
  issues: [],
});

const report = (count: number, current = true): DataQualityReport => ({
  run: {
    session: "2026-11-24",
    checkedAt: "2026-11-24T21:31:04.000Z",
    symbols: 20,
    checks: [check(count)],
  },
  expectedSession: current ? "2026-11-24" : "2026-11-25",
  current,
});

describe("dataQualitySummary", () => {
  it("says every check passed, with when and for which session", () => {
    expect(dataQualitySummary(report(0))).toEqual({
      tone: "positive",
      label: "All checks passed",
      detail:
        "Checked 2026-11-24 21:31 UTC for the session of 2026-11-24, 20 symbols.",
    });
  });

  it("counts the problems", () => {
    expect(dataQualitySummary(report(3))).toMatchObject({
      tone: "negative",
      label: "3 problems",
    });
  });

  it("warns when the check is older than the session due, even a clean one", () => {
    const late = dataQualitySummary(report(0, false));
    expect(late).toMatchObject({ tone: "warning", label: "Check overdue" });
    expect(late.detail).toContain("2026-11-25 hasn't been checked");
  });

  it("tells no check from no answer", () => {
    expect(
      dataQualitySummary({
        run: null,
        expectedSession: "2026-11-24",
        current: false,
      }).label
    ).toBe("Not checked yet");
    expect(dataQualitySummary(null).label).toBe("Unavailable");
  });
});
