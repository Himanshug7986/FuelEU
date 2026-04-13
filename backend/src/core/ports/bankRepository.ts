export interface BankRepositoryPort {
  totalBankedForYear(shipId: string, year: number): Promise<number>;
  insertBankEntry(shipId: string, year: number, amountGco2eq: number): Promise<void>;
  /** Returns rows for GET /banking/records */
  listEntries(shipId: string, year: number): Promise<{ id: string; amountGco2eq: number; createdAt: string }[]>;
}
