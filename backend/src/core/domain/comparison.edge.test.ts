import { describe, expect, it } from "vitest";
import { computePercentDiff, isCompliant } from "./comparison.js";
import { TARGET_INTENSITY_GCO2E_PER_MJ } from "../../shared/constants.js";

describe("comparison edge cases", () => {
  it("computePercentDiff returns 0 when baseline is 0 (avoid divide-by-zero)", () => {
    expect(computePercentDiff(0, 100)).toBe(0);
  });

  it("isCompliant true at target and false above target", () => {
    expect(isCompliant(TARGET_INTENSITY_GCO2E_PER_MJ)).toBe(true);
    expect(isCompliant(TARGET_INTENSITY_GCO2E_PER_MJ + 0.0001)).toBe(false);
  });
});

