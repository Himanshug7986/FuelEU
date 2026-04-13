import { assertPositiveBankable } from "../domain/banking.js";
import type { ShipComplianceRepositoryPort } from "../ports/shipComplianceRepository.js";
import type { BankRepositoryPort } from "../ports/bankRepository.js";

export async function bankSurplus(
  complianceRepo: ShipComplianceRepositoryPort,
  bankRepo: BankRepositoryPort,
  shipId: string,
  year: number
): Promise<{ banked: number }> {
  const cb = await complianceRepo.getSnapshot(shipId, year);
  if (cb === null) throw new Error(`No compliance snapshot for ${shipId} / ${year}`);
  assertPositiveBankable(cb);
  await bankRepo.insertBankEntry(shipId, year, cb);
  await complianceRepo.upsertSnapshot(shipId, year, 0);
  return { banked: cb };
}
