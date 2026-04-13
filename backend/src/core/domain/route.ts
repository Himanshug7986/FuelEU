export type RouteRecord = {
  id: string;
  routeId: string;
  shipId: string;
  vesselType: string;
  fuelType: string;
  year: number;
  ghgIntensity: number;
  fuelConsumptionT: number;
  distanceKm: number;
  totalEmissionsT: number;
  isBaseline: boolean;
};
