import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./createApp.js";
import type { RouteRepositoryPort } from "../../../core/ports/routeRepository.js";
import type { RouteDataForCompliancePort } from "../../../core/ports/routeDataForCompliancePort.js";
import type { ShipComplianceRepositoryPort } from "../../../core/ports/shipComplianceRepository.js";
import type { BankRepositoryPort } from "../../../core/ports/bankRepository.js";
import type { PoolRepositoryPort } from "../../../core/ports/poolRepository.js";
import type { RouteRecord } from "../../../core/domain/route.js";

const routes: RouteRecord[] = [
  {
    id: "1",
    routeId: "R001",
    shipId: "SHIP-001",
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
    shipId: "SHIP-002",
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

const routeRepo: RouteRepositoryPort = {
  findAll: async () => routes,
  findByRouteId: async (id) => routes.find((r) => r.routeId === id) ?? null,
  setBaseline: async (id) => {
    routes.forEach((r) => {
      r.isBaseline = r.routeId === id;
    });
  },
};

const routeData: RouteDataForCompliancePort = {
  getPrimaryRouteForShipYear: async () => ({ ghgIntensity: 91, fuelConsumptionT: 5000 }),
};

const complianceRepo: ShipComplianceRepositoryPort = {
  upsertSnapshot: async () => {},
  getSnapshot: async (shipId, year) => (shipId === "SHIP-002" && year === 2024 ? 1_000 : null),
  listByYear: async () => [{ shipId: "SHIP-002", cbGco2eq: 1_000 }],
};

const bankRepo: BankRepositoryPort = {
  totalBankedForYear: async () => 0,
  insertBankEntry: async () => {},
  listEntries: async () => [],
};

const poolRepo: PoolRepositoryPort = {
  createPool: async () => "pool-1",
};

const app = createApp({
  routeRepo,
  routeData,
  complianceRepo,
  bankRepo,
  poolRepo,
  defaultShipId: "SHIP-002",
});

describe("createApp HTTP", () => {
  it("GET /routes", async () => {
    const res = await request(app).get("/routes");
    expect(res.status).toBe(200);
    expect(res.body[0].routeId).toBe("R001");
  });

  it("GET /routes/comparison", async () => {
    const res = await request(app).get("/routes/comparison");
    expect(res.status).toBe(200);
    expect(res.body.baseline.routeId).toBe("R001");
    expect(res.body.comparisons).toHaveLength(1);
  });

  it("GET /compliance/cb", async () => {
    const res = await request(app).get("/compliance/cb?year=2024");
    expect(res.status).toBe(200);
    expect(res.body.shipId).toBe("SHIP-002");
  });
});
