import { describe, expect, it } from "vitest";
import { computeComplianceBalanceGco2eq, energyInScopeMj } from "./complianceBalance.js";
import { TARGET_INTENSITY_GCO2E_PER_MJ } from "../../shared/constants.js";

describe("energyInScopeMj", () => {
  it("uses 41000 MJ/t", () => {
    expect(energyInScopeMj(5000)).toBe(5000 * 41000);
  });
});

describe("computeComplianceBalanceGco2eq", () => {
  it("matches KPI row R001", () => {
    const cb = computeComplianceBalanceGco2eq(91, 5000, TARGET_INTENSITY_GCO2E_PER_MJ);
    expect(cb).toBeCloseTo((TARGET_INTENSITY_GCO2E_PER_MJ - 91) * 5000 * 41000, 0);
  });
});
