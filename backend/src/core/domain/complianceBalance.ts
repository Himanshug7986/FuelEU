import { MJ_PER_TONNE_FUEL, TARGET_INTENSITY_GCO2E_PER_MJ } from "../../shared/constants.js";

/**
 * Energy in scope (MJ) ≈ fuelConsumption (t) × 41_000 MJ/t
 * Compliance balance (gCO₂e) = (Target − Actual intensity) × Energy (MJ)
 */
export function energyInScopeMj(fuelConsumptionT: number): number {
  return fuelConsumptionT * MJ_PER_TONNE_FUEL;
}

export function computeComplianceBalanceGco2eq(
  actualGhgIntensity: number,
  fuelConsumptionT: number,
  targetIntensity: number = TARGET_INTENSITY_GCO2E_PER_MJ
): number {
  const energyMj = energyInScopeMj(fuelConsumptionT);
  return (targetIntensity - actualGhgIntensity) * energyMj;
}
