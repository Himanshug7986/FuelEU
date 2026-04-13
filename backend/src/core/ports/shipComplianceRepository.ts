export interface ShipComplianceRepositoryPort {
  upsertSnapshot(shipId: string, year: number, cbGco2eq: number): Promise<void>;
  getSnapshot(shipId: string, year: number): Promise<number | null>;
  listByYear(year: number): Promise<{ shipId: string; cbGco2eq: number }[]>;
}
