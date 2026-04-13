import { describe, expect, it } from "vitest";
import { assertApplyAmount, assertPositiveBankable } from "./banking.js";

describe("assertPositiveBankable", () => {
  it("throws for non-positive", () => {
    expect(() => assertPositiveBankable(0)).toThrow();
    expect(() => assertPositiveBankable(-1)).toThrow();
  });
});

describe("assertApplyAmount", () => {
  it("rejects over-apply", () => {
    expect(() => assertApplyAmount(100, 50, -10)).toThrow(/exceeds/);
  });
  it("rejects apply on surplus", () => {
    expect(() => assertApplyAmount(10, 100, 5)).toThrow(/deficit/);
  });
});
