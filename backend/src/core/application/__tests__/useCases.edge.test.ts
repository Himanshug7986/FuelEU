import { describe, expect, it, vi } from "vitest";
import { applyBanked } from "../applyBanked.js";
import { bankSurplus } from "../bankSurplus.js";
import { getAdjustedCBForShip, listAdjustedCBForYear } from "../getAdjustedCB.js";
import { getBankingRecords } from "../getBankingRecords.js";
import { setBaseline } from "../setBaseline.js";
import type { BankRepositoryPort } from "../../ports/bankRepository.js";
import type { RouteRepositoryPort } from "../../ports/routeRepository.js";
import type { ShipComplianceRepositoryPort } from "../../ports/shipComplianceRepository.js";

describe("application use-cases (edge cases)", () => {
  it("setBaseline throws when route does not exist", async () => {
    const repo: RouteRepositoryPort = {
      findAll: async () => [],
      findByRouteId: async () => null,
      setBaseline: async () => {},
    };
    await expect(setBaseline(repo, "R404")).rejects.toThrow(/not found/i);
  });

  it("getBankingRecords returns bankRepo.listEntries output", async () => {
    const bankRepo: BankRepositoryPort = {
      totalBankedForYear: async () => 0,
      insertBankEntry: async () => {},
      listEntries: async () => [{ id: "1", amountGco2eq: 10, createdAt: "2026-01-01T00:00:00.000Z" }],
    };
    const out = await getBankingRecords(bankRepo, "S", 2024);
    expect(out).toEqual([{ id: "1", amountGco2eq: 10, createdAt: "2026-01-01T00:00:00.000Z" }]);
  });

  it("getAdjustedCBForShip throws when snapshot missing", async () => {
    const compliance: ShipComplianceRepositoryPort = {
      upsertSnapshot: async () => {},
      getSnapshot: async () => null,
      listByYear: async () => [],
    };
    const bank: BankRepositoryPort = {
      totalBankedForYear: async () => 0,
      insertBankEntry: async () => {},
      listEntries: async () => [],
    };
    await expect(getAdjustedCBForShip(compliance, bank, "S", 2024)).rejects.toThrow(/no compliance snapshot/i);
  });

  it("listAdjustedCBForYear combines live CB + bank ledger", async () => {
    const compliance: ShipComplianceRepositoryPort = {
      upsertSnapshot: async () => {},
      getSnapshot: async () => null,
      listByYear: async () => [
        { shipId: "A", cbGco2eq: 100 },
        { shipId: "B", cbGco2eq: -50 },
      ],
    };
    const bank: BankRepositoryPort = {
      totalBankedForYear: async (shipId) => (shipId === "A" ? 10 : 0),
      insertBankEntry: async () => {},
      listEntries: async () => [],
    };
    const out = await listAdjustedCBForYear(compliance, bank, 2024);
    expect(out).toEqual([
      { shipId: "A", adjustedCb: 100, bankedAmount: 10 },
      { shipId: "B", adjustedCb: -50, bankedAmount: 0 },
    ]);
  });

  it("bankSurplus errors when snapshot missing and banks+zeros when positive", async () => {
    const complianceMissing: ShipComplianceRepositoryPort = {
      upsertSnapshot: async () => {},
      getSnapshot: async () => null,
      listByYear: async () => [],
    };
    const bankRepo: BankRepositoryPort = {
      totalBankedForYear: async () => 0,
      insertBankEntry: vi.fn(async () => {}),
      listEntries: async () => [],
    };
    await expect(bankSurplus(complianceMissing, bankRepo, "S", 2024)).rejects.toThrow(/no compliance snapshot/i);

    const compliance: ShipComplianceRepositoryPort = {
      upsertSnapshot: vi.fn(async () => {}),
      getSnapshot: async () => 123,
      listByYear: async () => [],
    };
    const out = await bankSurplus(compliance, bankRepo, "S", 2024);
    expect(out).toEqual({ banked: 123 });
    expect(bankRepo.insertBankEntry).toHaveBeenCalledWith("S", 2024, 123);
    expect(compliance.upsertSnapshot).toHaveBeenCalledWith("S", 2024, 0);
  });

  it("applyBanked errors when snapshot missing and when applying on surplus", async () => {
    const complianceMissing: ShipComplianceRepositoryPort = {
      upsertSnapshot: async () => {},
      getSnapshot: async () => null,
      listByYear: async () => [],
    };
    const bank: BankRepositoryPort = {
      totalBankedForYear: async () => 100,
      insertBankEntry: async () => {},
      listEntries: async () => [],
    };
    await expect(applyBanked(complianceMissing, bank, "S", 2024, 10)).rejects.toThrow(/no compliance snapshot/i);

    const complianceSurplus: ShipComplianceRepositoryPort = {
      upsertSnapshot: async () => {},
      getSnapshot: async () => 5,
      listByYear: async () => [],
    };
    await expect(applyBanked(complianceSurplus, bank, "S", 2024, 10)).rejects.toThrow(/deficit/i);
  });
});

