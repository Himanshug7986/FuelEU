/** Outbound port: resolve primary route metrics for CB computation per ship/year */
export interface RouteDataForCompliancePort {
  getPrimaryRouteForShipYear(shipId: string, year: number): Promise<{
    ghgIntensity: number;
    fuelConsumptionT: number;
  } | null>;
}
