import type { ShipComplianceRepositoryPort } from "../ports/shipComplianceRepository.js";
import type { BankRepositoryPort } from "../ports/bankRepository.js";

/**
 * Live compliance position after banking operations lives in `ship_compliance`.
 * `bankedAmount` is net ledger sum (positive = surplus held in bank).
 */
export async function getAdjustedCBForShip(
  complianceRepo: ShipComplianceRepositoryPort,
  bankRepo: BankRepositoryPort,
  shipId: string,
  year: number
): Promise<{ shipId: string; year: number; adjustedCb: number; bankedAmount: number }> {
  const live = await complianceRepo.getSnapshot(shipId, year);
  if (live === null) throw new Error(`No compliance snapshot for ${shipId} / ${year}`);
  const banked = await bankRepo.totalBankedForYear(shipId, year);
  return {
    shipId,
    year,
    adjustedCb: live,
    bankedAmount: banked,
  };
}

export async function listAdjustedCBForYear(
  complianceRepo: ShipComplianceRepositoryPort,
  bankRepo: BankRepositoryPort,
  year: number
): Promise<{ shipId: string; adjustedCb: number; bankedAmount: number }[]> {
  const rows = await complianceRepo.listByYear(year);
  const out: { shipId: string; adjustedCb: number; bankedAmount: number }[] = [];
  for (const r of rows) {
    const banked = await bankRepo.totalBankedForYear(r.shipId, year);
    out.push({
      shipId: r.shipId,
      adjustedCb: r.cbGco2eq,
      bankedAmount: banked,
    });
  }
  return out;
}
