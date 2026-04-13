import { computeComparison as row } from "../domain/comparison.js";
import type { ComparisonRow } from "../domain/comparison.js";
import type { RouteRepositoryPort } from "../ports/routeRepository.js";

export type RouteComparisonResult = {
  baseline: { routeId: string; ghgIntensity: number };
  targetIntensity: number;
  comparisons: ComparisonRow[];
};

export async function computeRouteComparison(
  repo: RouteRepositoryPort,
  targetIntensity: number
): Promise<RouteComparisonResult> {
  const routes = await repo.findAll();
  const baseline = routes.find((r) => r.isBaseline);
  if (!baseline) throw new Error("No baseline route configured");

  const comparisons: ComparisonRow[] = routes
    .filter((r) => r.routeId !== baseline.routeId)
    .map((r) => row(baseline.ghgIntensity, r.routeId, r.ghgIntensity));

  return {
    baseline: { routeId: baseline.routeId, ghgIntensity: baseline.ghgIntensity },
    targetIntensity,
    comparisons,
  };
}
