import { describe, expect, it } from "vitest";
import {
  cashRatio,
  cashSign,
  fromCents,
  subtractCash,
  toCents,
} from "./money";

describe("cash strings", () => {
  it("reads and writes whole cents, sign included", () => {
    expect(toCents("1234.5")).toBe(123450n);
    expect(toCents("-0.07")).toBe(-7n);
    expect(toCents("10")).toBe(1000n);
    expect(toCents("1.234")).toBeNull();
    expect(toCents("abc")).toBeNull();
    expect(fromCents(-7n)).toBe("-0.07");
    expect(fromCents(123450n)).toBe("1234.50");
  });

  it("subtracts without a float in sight", () => {
    // 0.1 + 0.2 territory: as floats this is 0.30000000000000004 - 0.3.
    expect(subtractCash("0.30", "0.3")).toBe("0.00");
    expect(subtractCash("9999999999999.99", "0.01")).toBe("9999999999999.98");
    expect(subtractCash("100", "250.5")).toBe("-150.50");
    expect(subtractCash("100", "")).toBeNull();
  });

  it("gives a ratio only against something above zero", () => {
    expect(cashRatio("250", "1000")).toBe(0.25);
    expect(cashRatio("-50", "1000")).toBe(-0.05);
    expect(cashRatio("50", "0")).toBeNull();
    expect(cashRatio("50", "-10")).toBeNull();
  });

  it("knows which way a figure points", () => {
    expect(cashSign("-0.01")).toBe(-1);
    expect(cashSign("0.00")).toBe(0);
    expect(cashSign("12")).toBe(1);
  });
});
