import { describe, expect, it } from "vitest";
import { createPool } from "./createPool.js";
import type { PoolRepositoryPort } from "../ports/poolRepository.js";

const poolRepo: PoolRepositoryPort = {
  createPool: async () => "pid",
};

describe("createPool use case", () => {
  it("allocates and persists", async () => {
    const r = await createPool(poolRepo, {
      year: 2025,
      members: [
        { shipId: "A", adjustedCb: -50 },
        { shipId: "B", adjustedCb: 80 },
      ],
    });
    expect(r.poolSum).toBe(30);
    expect(r.members).toHaveLength(2);
    expect(r.poolId).toBe("pid");
  });
});
