import { assertApplyAmount } from "../domain/banking.js";
import type { ShipComplianceRepositoryPort } from "../ports/shipComplianceRepository.js";
import type { BankRepositoryPort } from "../ports/bankRepository.js";
import type { BankApplyResult } from "../domain/banking.js";

/**
 * Applies banked surplus to current deficit: increases stored CB by `amount`
 * and records a negative bank entry to reduce available banked balance.
 */
export async function applyBanked(
  complianceRepo: ShipComplianceRepositoryPort,
  bankRepo: BankRepositoryPort,
  shipId: string,
  year: number,
  amount: number
): Promise<BankApplyResult> {
  const available = await bankRepo.totalBankedForYear(shipId, year);
  const currentCb = await complianceRepo.getSnapshot(shipId, year);
  if (currentCb === null) throw new Error(`No compliance snapshot for ${shipId} / ${year}`);

  assertApplyAmount(amount, available, currentCb);

  const cbBefore = currentCb;
  const cbAfter = cbBefore + amount;
  await complianceRepo.upsertSnapshot(shipId, year, cbAfter);
  await bankRepo.insertBankEntry(shipId, year, -amount);

  return { cbBefore, applied: amount, cbAfter };
}
