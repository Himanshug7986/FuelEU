export type RouteDto = {
  routeId: string;
  vesselType: string;
  fuelType: string;
  year: number;
  ghgIntensity: number;
  fuelConsumption: number;
  distance: number;
  totalEmissions: number;
  shipId?: string;
};

export type ComparisonResponse = {
  baseline: { routeId: string; ghgIntensity: number };
  targetIntensity: number;
  comparisons: {
    routeId: string;
    ghgIntensity: number;
    percentDiff: number;
    compliant: boolean;
  }[];
};

export type CbResponse = {
  shipId: string;
  year: number;
  cbGco2eq: number;
  energyMj: number;
};

export type AdjustedShip = {
  shipId: string;
  adjustedCb: number;
  bankedAmount: number;
};

export type AdjustedCbResponse = {
  year: number;
  ships: AdjustedShip[];
};

export type ApplyBankResponse = {
  shipId: string;
  year: number;
  cb_before: number;
  applied: number;
  cb_after: number;
};

export type PoolCreateResponse = {
  poolId: string;
  poolSum: number;
  members: { shipId: string; cbBefore: number; cbAfter: number }[];
};
