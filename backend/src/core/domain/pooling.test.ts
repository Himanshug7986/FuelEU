import { describe, expect, it } from "vitest";
import {
  allocatePoolGreedy,
  assertPoolFeasible,
  validatePoolInvariants,
} from "./pooling.js";

describe("allocatePoolGreedy", () => {
  it("clears deficits when sum >= 0", () => {
    const members = [
      { shipId: "A", cbBefore: -100 },
      { shipId: "B", cbBefore: 60 },
      { shipId: "C", cbBefore: 50 },
    ];
    assertPoolFeasible(members);
    const out = allocatePoolGreedy(members);
    const sumAfter = out.reduce((a, m) => a + m.cbAfter, 0);
    const sumBefore = members.reduce((a, m) => a + m.cbBefore, 0);
    expect(sumAfter).toBeCloseTo(sumBefore, 5);
    expect(out.every((m) => m.cbAfter >= 0)).toBe(true);
    validatePoolInvariants(out, sumBefore);
  });

  it("rejects negative pool sum", () => {
    expect(() =>
      assertPoolFeasible([
        { shipId: "A", cbBefore: -100 },
        { shipId: "B", cbBefore: 30 },
      ])
    ).toThrow();
  });
});
