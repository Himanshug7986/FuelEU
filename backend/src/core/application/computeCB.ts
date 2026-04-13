import { computeComplianceBalanceGco2eq, energyInScopeMj } from "../domain/complianceBalance.js";
import type { ShipComplianceRepositoryPort } from "../ports/shipComplianceRepository.js";
import type { RouteDataForCompliancePort } from "../ports/routeDataForCompliancePort.js";

export type ComputeCBResult = {
  shipId: string;
  year: number;
  cbGco2eq: number;
  energyMj: number;
};

/** Computes from route; persists only when no snapshot exists (banking preserves live CB). */
export async function computeAndStoreCB(
  routeData: RouteDataForCompliancePort,
  complianceRepo: ShipComplianceRepositoryPort,
  shipId: string,
  year: number
): Promise<ComputeCBResult> {
  const data = await routeData.getPrimaryRouteForShipYear(shipId, year);
  if (!data) throw new Error(`No route data for ship ${shipId} in ${year}`);

  const energyMj = energyInScopeMj(data.fuelConsumptionT);
  const existing = await complianceRepo.getSnapshot(shipId, year);
  if (existing !== null) {
    return { shipId, year, cbGco2eq: existing, energyMj };
  }

  const cbGco2eq = computeComplianceBalanceGco2eq(data.ghgIntensity, data.fuelConsumptionT);
  await complianceRepo.upsertSnapshot(shipId, year, cbGco2eq);

  return {
    shipId,
    year,
    cbGco2eq,
    energyMj,
  };
}
