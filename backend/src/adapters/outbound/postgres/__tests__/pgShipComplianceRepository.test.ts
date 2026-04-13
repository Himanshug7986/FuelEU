import { describe, expect, it, vi } from "vitest";
import { PgShipComplianceRepository } from "../pgShipComplianceRepository.js";

describe("PgShipComplianceRepository", () => {
  it("upsertSnapshot issues an upsert query", async () => {
    const pool = { query: vi.fn(async () => ({ rows: [] })) };
    const repo = new PgShipComplianceRepository(pool as any);
    await repo.upsertSnapshot("S", 2024, 123);

    expect(pool.query).toHaveBeenCalledOnce();
    const [sql, values] = pool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO ship_compliance/);
    expect(sql).toMatch(/ON CONFLICT/);
    expect(values).toEqual(["S", 2024, 123]);
  });

  it("getSnapshot returns null when no rows", async () => {
    const pool = { query: vi.fn(async () => ({ rows: [] })) };
    const repo = new PgShipComplianceRepository(pool as any);
    await expect(repo.getSnapshot("S", 2024)).resolves.toBeNull();
  });

  it("listByYear maps rows", async () => {
    const pool = {
      query: vi.fn(async () => ({
        rows: [
          { ship_id: "A", cb_gco2eq: 1 },
          { ship_id: "B", cb_gco2eq: -2 },
        ],
      })),
    };
    const repo = new PgShipComplianceRepository(pool as any);
    const out = await repo.listByYear(2024);
    expect(out).toEqual([
      { shipId: "A", cbGco2eq: 1 },
      { shipId: "B", cbGco2eq: -2 },
    ]);
  });
});

