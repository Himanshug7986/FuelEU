import { describe, expect, it, vi } from "vitest";
import { PgPoolRepository } from "../pgPoolRepository.js";

describe("PgPoolRepository", () => {
  it("creates pool and upserts ship_compliance in a transaction", async () => {
    const calls: { sql: string; values?: unknown[] }[] = [];

    const client = {
      query: vi.fn(async (sql: string, values?: unknown[]) => {
        calls.push({ sql, values });
        if (sql.includes("RETURNING id")) return { rows: [{ id: "pool-1" }] };
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const pool = { connect: vi.fn(async () => client) };
    const repo = new PgPoolRepository(pool as any);

    const poolId = await repo.createPool(2025, [
      { shipId: "A", cbBefore: 10, cbAfter: 0 },
      { shipId: "B", cbBefore: -10, cbAfter: 0 },
    ]);

    expect(poolId).toBe("pool-1");
    expect(calls[0].sql).toBe("BEGIN");
    expect(calls.some((c) => c.sql.includes("INSERT INTO pool_members"))).toBe(true);
    expect(calls.some((c) => c.sql.includes("INSERT INTO ship_compliance"))).toBe(true);
    expect(calls.at(-1)?.sql).toBe("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back on error", async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql === "BEGIN") return {};
        throw new Error("boom");
      }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn(async () => client) };
    const repo = new PgPoolRepository(pool as any);
    await expect(repo.createPool(2025, [{ shipId: "A", cbBefore: 1, cbAfter: 1 }])).rejects.toThrow("boom");

    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});

