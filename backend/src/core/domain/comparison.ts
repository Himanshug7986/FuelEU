import { TARGET_INTENSITY_GCO2E_PER_MJ } from "../../shared/constants.js";

export type ComparisonRow = {
  routeId: string;
  ghgIntensity: number;
  percentDiff: number;
  compliant: boolean;
};

export function computePercentDiff(baselineIntensity: number, comparisonIntensity: number): number {
  if (baselineIntensity === 0) return 0;
  return ((comparisonIntensity / baselineIntensity) - 1) * 100;
}

export function isCompliant(ghgIntensity: number): boolean {
  return ghgIntensity <= TARGET_INTENSITY_GCO2E_PER_MJ;
}

export function computeComparison(
  baselineIntensity: number,
  comparisonRouteId: string,
  comparisonIntensity: number
): ComparisonRow {
  return {
    routeId: comparisonRouteId,
    ghgIntensity: comparisonIntensity,
    percentDiff: computePercentDiff(baselineIntensity, comparisonIntensity),
    compliant: isCompliant(comparisonIntensity),
  };
}
