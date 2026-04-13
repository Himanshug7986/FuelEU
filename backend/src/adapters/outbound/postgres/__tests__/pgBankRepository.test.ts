import { describe, expect, it, vi } from "vitest";
import { PgBankRepository } from "../pgBankRepository.js";

describe("PgBankRepository", () => {
  it("totalBankedForYear coerces to number", async () => {
    const pool = { query: vi.fn(async () => ({ rows: [{ s: "42" }] })) };
    const repo = new PgBankRepository(pool as any);
    await expect(repo.totalBankedForYear("S", 2024)).resolves.toBe(42);
  });

  it("insertBankEntry calls insert query", async () => {
    const pool = { query: vi.fn(async () => ({ rows: [] })) };
    const repo = new PgBankRepository(pool as any);
    await repo.insertBankEntry("S", 2024, 123);
    const [sql, values] = pool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO bank_entries/);
    expect(values).toEqual(["S", 2024, 123]);
  });

  it("listEntries maps created_at to ISO strings", async () => {
    const d = new Date("2026-01-01T00:00:00.000Z");
    const pool = { query: vi.fn(async () => ({ rows: [{ id: "1", amount_gco2eq: 10, created_at: d }] })) };
    const repo = new PgBankRepository(pool as any);
    const out = await repo.listEntries("S", 2024);
    expect(out).toEqual([{ id: "1", amountGco2eq: 10, createdAt: d.toISOString() }]);
  });
});

