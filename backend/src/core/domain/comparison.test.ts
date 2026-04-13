import { describe, expect, it } from "vitest";
import { computeComparison, computePercentDiff, isCompliant } from "./comparison.js";
import { TARGET_INTENSITY_GCO2E_PER_MJ } from "../../shared/constants.js";

describe("computePercentDiff", () => {
  it("matches spec formula", () => {
    const baseline = 91;
    const comp = 89.2;
    expect(computePercentDiff(baseline, comp)).toBeCloseTo(((comp / baseline) - 1) * 100, 5);
  });
});

describe("isCompliant", () => {
  it("is compliant at target", () => {
    expect(isCompliant(TARGET_INTENSITY_GCO2E_PER_MJ)).toBe(true);
  });
  it("is not compliant above target", () => {
    expect(isCompliant(91)).toBe(false);
  });
});

describe("computeComparison", () => {
  it("builds row", () => {
    const row = computeComparison(91, "R004", 89.2);
    expect(row.routeId).toBe("R004");
    expect(row.ghgIntensity).toBe(89.2);
    expect(row.compliant).toBe(true);
  });
});
