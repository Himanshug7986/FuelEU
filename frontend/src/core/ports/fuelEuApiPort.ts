import type {
  AdjustedCbResponse,
  ApplyBankResponse,
  CbResponse,
  ComparisonResponse,
  PoolCreateResponse,
  RouteDto,
} from "../domain/types.js";

export type RouteFilters = {
  vesselType?: string;
  fuelType?: string;
  year?: number;
};

export interface FuelEuApiPort {
  listRoutes(filters?: RouteFilters): Promise<RouteDto[]>;
  setBaseline(routeId: string): Promise<void>;
  getComparison(): Promise<ComparisonResponse>;
  getComplianceCb(shipId: string, year: number): Promise<CbResponse>;
  getAdjustedCb(year: number, shipId?: string): Promise<AdjustedCbResponse>;
  getBankingRecords(shipId: string, year: number): Promise<{
    shipId: string;
    year: number;
    records: { id: string; amountGco2eq: number; createdAt: string }[];
  }>;
  bankSurplus(shipId: string, year: number): Promise<{ banked: number }>;
  applyBanked(shipId: string, year: number, amount: number): Promise<ApplyBankResponse>;
  createPool(
    year: number,
    members: { shipId: string; adjustedCb: number }[]
  ): Promise<PoolCreateResponse>;
}
