import { describe, expect, it } from "vitest";
import { applyBanked } from "./applyBanked.js";
import type { ShipComplianceRepositoryPort } from "../ports/shipComplianceRepository.js";
import type { BankRepositoryPort } from "../ports/bankRepository.js";

function makeRepos(cb: number, banked: number) {
  const compliance: ShipComplianceRepositoryPort = {
    upsertSnapshot: async () => {},
    getSnapshot: async () => cb,
    listByYear: async () => [],
  };
  const bank: BankRepositoryPort = {
    totalBankedForYear: async () => banked,
    insertBankEntry: async () => {},
    listEntries: async () => [],
  };
  return { compliance, bank };
}

describe("applyBanked", () => {
  it("returns KPI shape", async () => {
    const { compliance, bank } = makeRepos(-1_000_000, 500_000);
    const r = await applyBanked(compliance, bank, "S", 2025, 200_000);
    expect(r.cbBefore).toBe(-1_000_000);
    expect(r.applied).toBe(200_000);
    expect(r.cbAfter).toBe(-800_000);
  });
});
