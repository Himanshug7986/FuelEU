import type { BankRepositoryPort } from "../ports/bankRepository.js";

export async function getBankingRecords(
  bankRepo: BankRepositoryPort,
  shipId: string,
  year: number
) {
  return bankRepo.listEntries(shipId, year);
}
