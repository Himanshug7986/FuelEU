import { describe, expect, it } from "vitest";
import { complianceIcon, formatNumber } from "./formatting.js";

describe("formatting", () => {
  it("formatNumber", () => {
    expect(formatNumber(1.2345, 2)).toBe("1.23");
  });
  it("complianceIcon", () => {
    expect(complianceIcon(true)).toBe("✅");
    expect(complianceIcon(false)).toBe("❌");
  });
});
