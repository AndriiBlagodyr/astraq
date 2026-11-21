import { marketStatusText, type MarketStatus } from "./market-status";

const session = (date: string, closesAt = `${date}T21:00:00.000Z`) => ({
  date,
  opensAt: `${date}T14:30:00.000Z`,
  closesAt,
});

describe("marketStatusText", () => {
  it("says when an open market closes and which session is next", () => {
    const status: MarketStatus = {
      asOf: "2026-11-25T16:00:00.000Z",
      open: true,
      session: session("2026-11-25"),
      nextSession: session("2026-11-27", "2026-11-27T18:00:00.000Z"),
      calendar: "exchange",
    };
    expect(marketStatusText(status)).toEqual({
      label: "Market open",
      detail: "Closes at 4:00 PM ET.",
      next: "Next session: Friday, Nov 27, closing early at 1:00 PM ET.",
      caveat: null,
    });
  });

  it("says when a closed market opens, and 'today' before the open", () => {
    const closed: MarketStatus = {
      asOf: "2026-11-26T16:00:00.000Z",
      open: false,
      session: null,
      nextSession: session("2026-11-27", "2026-11-27T18:00:00.000Z"),
      calendar: "exchange",
    };
    expect(marketStatusText(closed).detail).toBe(
      "Opens Friday, Nov 27 at 9:30 AM ET, closing early at 1:00 PM ET."
    );
    // 08:00 New York on the Monday: the next session is the same day.
    expect(
      marketStatusText({
        ...closed,
        asOf: "2026-11-30T13:00:00.000Z",
        nextSession: session("2026-11-30"),
      }).detail
    ).toBe("Opens today at 9:30 AM ET.");
  });

  it("flags a half day in progress and hours that come from the weekday rule", () => {
    const text = marketStatusText({
      asOf: "2026-11-27T16:00:00.000Z",
      open: true,
      session: session("2026-11-27", "2026-11-27T18:00:00.000Z"),
      nextSession: session("2026-11-30"),
      calendar: "weekdays",
    });
    expect(text.detail).toBe("Closes early today, at 1:00 PM ET.");
    expect(text.caveat).toMatch(/holidays and half days aren't known/);
  });
});
