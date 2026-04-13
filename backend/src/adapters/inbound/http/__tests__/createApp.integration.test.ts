import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../createApp.js";
import type { RouteRepositoryPort } from "../../../../core/ports/routeRepository.js";
import type { RouteDataForCompliancePort } from "../../../../core/ports/routeDataForCompliancePort.js";
import type { ShipComplianceRepositoryPort } from "../../../../core/ports/shipComplianceRepository.js";
import type { BankRepositoryPort } from "../../../../core/ports/bankRepository.js";
import type { PoolRepositoryPort } from "../../../../core/ports/poolRepository.js";
import type { RouteRecord } from "../../../../core/domain/route.js";

function makeRoute(overrides: Partial<RouteRecord>): RouteRecord {
  return {
    id: overrides.id ?? "id",
    routeId: overrides.routeId ?? "R000",
    shipId: overrides.shipId ?? "SHIP-X",
    vesselType: overrides.vesselType ?? "Container",
    fuelType: overrides.fuelType ?? "HFO",
    year: overrides.year ?? 2024,
    ghgIntensity: overrides.ghgIntensity ?? 90,
    fuelConsumptionT: overrides.fuelConsumptionT ?? 5000,
    distanceKm: overrides.distanceKm ?? 12000,
    totalEmissionsT: overrides.totalEmissionsT ?? 4500,
    isBaseline: overrides.isBaseline ?? false,
  };
}

describe("createApp integration (ports mocked)", () => {
  it("GET /health returns ok", async () => {
    const app = createApp({
      routeRepo: { findAll: async () => [], findByRouteId: async () => null, setBaseline: async () => {} },
      routeData: { getPrimaryRouteForShipYear: async () => null },
      complianceRepo: { upsertSnapshot: async () => {}, getSnapshot: async () => null, listByYear: async () => [] },
      bankRepo: { totalBankedForYear: async () => 0, insertBankEntry: async () => {}, listEntries: async () => [] },
      poolRepo: { createPool: async () => "p" },
      defaultShipId: "SHIP-002",
    });

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("GET /routes maps records and respects filters", async () => {
    const all: RouteRecord[] = [
      makeRoute({ id: "1", routeId: "R001", vesselType: "Container", fuelType: "HFO", year: 2024, isBaseline: true }),
      makeRoute({ id: "2", routeId: "R002", vesselType: "Tanker", fuelType: "MGO", year: 2025 }),
    ];

    const routeRepo: RouteRepositoryPort = {
      findAll: async (filters) => {
        if (!filters) return all;
        return all.filter((r) => {
          if (filters.vesselType && r.vesselType !== filters.vesselType) return false;
          if (filters.fuelType && r.fuelType !== filters.fuelType) return false;
          if (filters.year !== undefined && r.year !== filters.year) return false;
          return true;
        });
      },
      findByRouteId: async (id) => all.find((r) => r.routeId === id) ?? null,
      setBaseline: async () => {},
    };

    const app = createApp({
      routeRepo,
      routeData: { getPrimaryRouteForShipYear: async () => null },
      complianceRepo: { upsertSnapshot: async () => {}, getSnapshot: async () => null, listByYear: async () => [] },
      bankRepo: { totalBankedForYear: async () => 0, insertBankEntry: async () => {}, listEntries: async () => [] },
      poolRepo: { createPool: async () => "p" },
      defaultShipId: "SHIP-002",
    });

    const res = await request(app).get("/routes?vesselType=Container&year=2024");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      routeId: "R001",
      vesselType: "Container",
      fuelType: "HFO",
      year: 2024,
    });
    expect(res.body[0].isBaseline).toBeUndefined();
  });

  it("POST /routes/:routeId/baseline sets baseline; 404 if not found", async () => {
    const all: RouteRecord[] = [makeRoute({ routeId: "R001", isBaseline: true }), makeRoute({ routeId: "R002" })];
    const setCalls: string[] = [];

    const routeRepo: RouteRepositoryPort = {
      findAll: async () => all,
      findByRouteId: async (id) => all.find((r) => r.routeId === id) ?? null,
      setBaseline: async (id) => {
        setCalls.push(id);
        all.forEach((r) => {
          r.isBaseline = r.routeId === id;
        });
      },
    };

    const app = createApp({
      routeRepo,
      routeData: { getPrimaryRouteForShipYear: async () => null },
      complianceRepo: { upsertSnapshot: async () => {}, getSnapshot: async () => null, listByYear: async () => [] },
      bankRepo: { totalBankedForYear: async () => 0, insertBankEntry: async () => {}, listEntries: async () => [] },
      poolRepo: { createPool: async () => "p" },
      defaultShipId: "SHIP-002",
    });

    const ok = await request(app).post("/routes/R002/baseline");
    expect(ok.status).toBe(204);
    expect(setCalls).toEqual(["R002"]);

    const missing = await request(app).post("/routes/NOPE/baseline");
    expect(missing.status).toBe(404);
    expect(missing.body.error).toMatch(/not found/i);
  });

  it("GET /routes/comparison returns 400 when no baseline is configured", async () => {
    const routeRepo: RouteRepositoryPort = {
      findAll: async () => [makeRoute({ routeId: "R001", isBaseline: false })],
      findByRouteId: async () => null,
      setBaseline: async () => {},
    };

    const app = createApp({
      routeRepo,
      routeData: { getPrimaryRouteForShipYear: async () => null },
      complianceRepo: { upsertSnapshot: async () => {}, getSnapshot: async () => null, listByYear: async () => [] },
      bankRepo: { totalBankedForYear: async () => 0, insertBankEntry: async () => {}, listEntries: async () => [] },
      poolRepo: { createPool: async () => "p" },
      defaultShipId: "SHIP-002",
    });

    const res = await request(app).get("/routes/comparison");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/baseline/i);
  });

  it("GET /compliance/cb validates year and uses default shipId", async () => {
    const routeData: RouteDataForCompliancePort = {
      getPrimaryRouteForShipYear: async (shipId, year) =>
        shipId === "SHIP-002" && year === 2024 ? { ghgIntensity: 88, fuelConsumptionT: 100 } : null,
    };

    const complianceRepo: ShipComplianceRepositoryPort = {
      upsertSnapshot: vi.fn(async () => {}),
      getSnapshot: vi.fn(async () => null),
      listByYear: vi.fn(async () => []),
    };

    const app = createApp({
      routeRepo: { findAll: async () => [], findByRouteId: async () => null, setBaseline: async () => {} },
      routeData,
      complianceRepo,
      bankRepo: { totalBankedForYear: async () => 0, insertBankEntry: async () => {}, listEntries: async () => [] },
      poolRepo: { createPool: async () => "p" },
      defaultShipId: "SHIP-002",
    });

    const bad = await request(app).get("/compliance/cb");
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/year is required/i);

    const ok = await request(app).get("/compliance/cb?year=2024");
    expect(ok.status).toBe(200);
    expect(ok.body.shipId).toBe("SHIP-002");
    expect(ok.body.cbGco2eq).toBeTypeOf("number");
    expect(complianceRepo.upsertSnapshot).toHaveBeenCalledOnce();
  });

  it("GET /compliance/adjusted-cb supports list and single-ship", async () => {
    const complianceRepo: ShipComplianceRepositoryPort = {
      upsertSnapshot: async () => {},
      getSnapshot: async (shipId) => (shipId === "S1" ? 100 : null),
      listByYear: async () => [
        { shipId: "S1", cbGco2eq: 100 },
        { shipId: "S2", cbGco2eq: -50 },
      ],
    };
    const bankRepo: BankRepositoryPort = {
      totalBankedForYear: async (shipId) => (shipId === "S1" ? 10 : 0),
      insertBankEntry: async () => {},
      listEntries: async () => [],
    };
    const app = createApp({
      routeRepo: { findAll: async () => [], findByRouteId: async () => null, setBaseline: async () => {} },
      routeData: { getPrimaryRouteForShipYear: async () => null },
      complianceRepo,
      bankRepo,
      poolRepo: { createPool: async () => "p" },
      defaultShipId: "S1",
    });

    const list = await request(app).get("/compliance/adjusted-cb?year=2024");
    expect(list.status).toBe(200);
    expect(list.body.ships).toHaveLength(2);
    expect(list.body.ships[0]).toMatchObject({ shipId: "S1", adjustedCb: 100, bankedAmount: 10 });

    const one = await request(app).get("/compliance/adjusted-cb?year=2024&shipId=S1");
    expect(one.status).toBe(200);
    expect(one.body.ships).toHaveLength(1);
    expect(one.body.ships[0]).toMatchObject({ shipId: "S1", adjustedCb: 100, bankedAmount: 10 });
  });

  it("POST /banking/bank returns error when CB is non-positive", async () => {
    const complianceRepo: ShipComplianceRepositoryPort = {
      upsertSnapshot: async () => {},
      getSnapshot: async () => 0,
      listByYear: async () => [],
    };
    const bankRepo: BankRepositoryPort = {
      totalBankedForYear: async () => 0,
      insertBankEntry: async () => {},
      listEntries: async () => [],
    };
    const app = createApp({
      routeRepo: { findAll: async () => [], findByRouteId: async () => null, setBaseline: async () => {} },
      routeData: { getPrimaryRouteForShipYear: async () => null },
      complianceRepo,
      bankRepo,
      poolRepo: { createPool: async () => "p" },
      defaultShipId: "S",
    });

    const res = await request(app).post("/banking/bank").send({ shipId: "S", year: 2024 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot bank/i);
  });

  it("POST /banking/apply validates body and returns KPI shape", async () => {
    const complianceRepo: ShipComplianceRepositoryPort = {
      upsertSnapshot: vi.fn(async () => {}),
      getSnapshot: async () => -100,
      listByYear: async () => [],
    };
    const bankRepo: BankRepositoryPort = {
      totalBankedForYear: async () => 1000,
      insertBankEntry: vi.fn(async () => {}),
      listEntries: async () => [],
    };
    const app = createApp({
      routeRepo: { findAll: async () => [], findByRouteId: async () => null, setBaseline: async () => {} },
      routeData: { getPrimaryRouteForShipYear: async () => null },
      complianceRepo,
      bankRepo,
      poolRepo: { createPool: async () => "p" },
      defaultShipId: "S",
    });

    const bad = await request(app).post("/banking/apply").send({ shipId: "S" });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/year and amount/i);

    const ok = await request(app).post("/banking/apply").send({ shipId: "S", year: 2024, amount: 25 });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ shipId: "S", year: 2024, cb_before: -100, applied: 25, cb_after: -75 });
    expect(bankRepo.insertBankEntry).toHaveBeenCalledOnce();
  });

  it("POST /pools validates members and returns 201 on success", async () => {
    const poolRepo: PoolRepositoryPort = {
      createPool: async () => "pool-123",
    };
    const app = createApp({
      routeRepo: { findAll: async () => [], findByRouteId: async () => null, setBaseline: async () => {} },
      routeData: { getPrimaryRouteForShipYear: async () => null },
      complianceRepo: { upsertSnapshot: async () => {}, getSnapshot: async () => null, listByYear: async () => [] },
      bankRepo: { totalBankedForYear: async () => 0, insertBankEntry: async () => {}, listEntries: async () => [] },
      poolRepo,
      defaultShipId: "S",
    });

    const bad = await request(app).post("/pools").send({ year: 2025, members: [] });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/members/i);

    const ok = await request(app)
      .post("/pools")
      .send({ year: 2025, members: [{ shipId: "A", adjustedCb: 10 }, { shipId: "B", adjustedCb: -10 }] });
    expect(ok.status).toBe(201);
    expect(ok.body.poolId).toBe("pool-123");
    expect(ok.body.members).toBeTypeOf("object");
  });
});

