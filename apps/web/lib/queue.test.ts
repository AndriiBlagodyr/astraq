import {
  attemptText,
  describePayload,
  jobTitle,
  queueSummary,
  type QueueJob,
  type QueueStatus,
} from "./queue";

const job = (over: Partial<QueueJob>): QueueJob => ({
  id: "1",
  name: "eod-refresh",
  data: { tickers: ["AAPL", "NVDA"], from: "2026-11-20", to: "2026-11-24" },
  attempts: 0,
  maxAttempts: 8,
  error: null,
  at: null,
  ...over,
});

const nextClose = job({
  id: "session-close-2026-11-27",
  name: "session-close",
  data: { session: "2026-11-27" },
  at: "2026-11-27T18:30:00.000Z",
});

const status = (over: Partial<QueueStatus> = {}): QueueStatus => ({
  queue: "market-data",
  asOf: "2026-11-25T22:00:00.000Z",
  counts: {
    waiting: 0,
    active: 0,
    delayed: 1,
    waitingChildren: 0,
    completed: 40,
    failed: 0,
    dead: 0,
  },
  active: [],
  delayed: [nextClose],
  failed: [],
  dead: [],
  ...over,
});

describe("queueSummary", () => {
  it("is healthy when the next close has its job and nothing is stuck", () => {
    expect(queueSummary(status())).toEqual({
      tone: "positive",
      label: "Healthy",
      detail:
        "Nothing is running. Next scheduled: After-close refresh · session 2026-11-27.",
    });
  });

  it("warns when no refresh is scheduled at all", () => {
    const summary = queueSummary(
      status({ delayed: [], counts: { ...status().counts, delayed: 0 } })
    );
    expect(summary).toMatchObject({
      tone: "warning",
      label: "Nothing scheduled",
    });
  });

  it("tells a job waiting out a retry from a scheduled one", () => {
    const summary = queueSummary(
      status({ delayed: [job({ attempts: 2, error: "503" }), nextClose] })
    );
    expect(summary).toMatchObject({ tone: "warning", label: "1 job retrying" });
  });

  it("puts dead letters before everything else", () => {
    const summary = queueSummary(
      status({
        counts: { ...status().counts, dead: 2, failed: 2 },
        delayed: [job({ attempts: 2 }), nextClose],
      })
    );
    expect(summary).toMatchObject({
      tone: "negative",
      label: "2 jobs given up on",
    });
  });
});

describe("job text", () => {
  it("names the job and what it is for", () => {
    expect(jobTitle(job({}))).toBe(
      "Bars refresh · AAPL, NVDA · 2026-11-20 to 2026-11-24"
    );
    expect(
      jobTitle(job({ name: "symbol-backfill", data: { ticker: "MSFT" } }))
    ).toBe("Backfill · MSFT");
  });

  it("cuts a long batch short and shows an unknown payload whole", () => {
    const tickers = ["A", "B", "C", "D", "E", "F"];
    expect(
      describePayload({ tickers, from: "2026-11-24", to: "2026-11-24" })
    ).toBe("A, B, C, D and 2 more · 2026-11-24");
    expect(describePayload({ depth: 3 })).toBe('{"depth":3}');
  });

  it("counts tries only once there has been one", () => {
    expect(attemptText(job({}))).toBeNull();
    expect(attemptText(job({ attempts: 3 }))).toBe("Try 3 of 8");
  });
});
