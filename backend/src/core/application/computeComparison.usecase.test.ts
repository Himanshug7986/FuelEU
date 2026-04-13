import { describe, expect, it } from "vitest";
import { computeRouteComparison } from "./computeComparison.js";
import type { RouteRepositoryPort } from "../ports/routeRepository.js";
import type { RouteRecord } from "../domain/route.js";

const routes: RouteRecord[] = [
  {
    id: "1",
    routeId: "R001",
    shipId: "S1",
    vesselType: "Container",
    fuelType: "HFO",
    year: 2024,
    ghgIntensity: 91,
    fuelConsumptionT: 5000,
    distanceKm: 12000,
    totalEmissionsT: 4500,
    isBaseline: true,
  },
  {
    id: "2",
    routeId: "R002",
    shipId: "S2",
    vesselType: "BulkCarrier",
    fuelType: "LNG",
    year: 2024,
    ghgIntensity: 88,
    fuelConsumptionT: 4800,
    distanceKm: 11500,
    totalEmissionsT: 4200,
    isBaseline: false,
  },
];

const repo: RouteRepositoryPort = {
  findAll: async () => routes,
  findByRouteId: async (id) => routes.find((r) => r.routeId === id) ?? null,
  setBaseline: async () => {},
};

describe("computeRouteComparison", () => {
  it("excludes baseline from comparisons", async () => {
    const r = await computeRouteComparison(repo, 89.3368);
    expect(r.baseline.routeId).toBe("R001");
    expect(r.comparisons).toHaveLength(1);
    expect(r.comparisons[0].routeId).toBe("R002");
  });
});
