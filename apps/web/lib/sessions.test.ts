import { describe, expect, it } from "vitest";
import { describeUserAgent, displayName, initials } from "./sessions";

describe("describeUserAgent", () => {
  it("names the browser and the platform", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("Safari on iPhone");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      )
    ).toBe("Chrome on Windows");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
      )
    ).toBe("Edge on Windows");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:120.0) Gecko/20100101 Firefox/120.0"
      )
    ).toBe("Firefox on Mac");
  });

  it("falls back to whichever half it recognises, or to unknown", () => {
    expect(describeUserAgent("curl/8.4.0")).toBe("Unknown device");
    expect(describeUserAgent("SomethingNew/1.0 (Android 14)")).toBe("Android");
    expect(describeUserAgent(null)).toBe("Unknown device");
  });
});

describe("initials", () => {
  it("takes the first two words of the name, else the email's first letter", () => {
    expect(initials("Andrii Blagodyr", "a@x.dev")).toBe("AB");
    expect(initials("  andrii  ", "a@x.dev")).toBe("A");
    expect(initials("Ann Lee Smith", "a@x.dev")).toBe("AL");
    expect(initials(null, "zoe@x.dev")).toBe("Z");
    expect(initials("", "")).toBe("?");
  });
});

describe("displayName", () => {
  it("prefers a non-blank name", () => {
    expect(displayName("Andrii", "a@x.dev")).toBe("Andrii");
    expect(displayName("   ", "a@x.dev")).toBe("a@x.dev");
    expect(displayName(null, "a@x.dev")).toBe("a@x.dev");
  });
});
