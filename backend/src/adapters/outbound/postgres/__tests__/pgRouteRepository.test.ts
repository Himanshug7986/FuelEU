import { describe, expect, it, vi } from "vitest";
import { PgRouteRepository } from "../pgRouteRepository.js";

function makePool() {
  return {
    query: vi.fn(),
  };
}

describe("PgRouteRepository", () => {
  it("findAll builds WHERE clause from filters", async () => {
    const pool = makePool();
    pool.query.mockResolvedValueOnce({ rows: [] });
    const repo = new PgRouteRepository(pool as any);

    await repo.findAll({ vesselType: "Container", fuelType: "HFO", year: 2024 });

    expect(pool.query).toHaveBeenCalledOnce();
    const [sql, values] = pool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/FROM routes WHERE/);
    expect(sql).toMatch(/vessel_type = \$1/);
    expect(sql).toMatch(/fuel_type = \$2/);
    expect(sql).toMatch(/year = \$3/);
    expect(values).toEqual(["Container", "HFO", 2024]);
  });

  it("findByRouteId maps row", async () => {
    const pool = makePool();
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: "uuid",
          route_id: "R001",
          ship_id: "SHIP-1",
          vessel_type: "Container",
          fuel_type: "HFO",
          year: 2024,
          ghg_intensity: 91,
          fuel_consumption_t: 5000,
          distance_km: 12000,
          total_emissions_t: 4500,
          is_baseline: true,
        },
      ],
    });
    const repo = new PgRouteRepository(pool as any);

    const r = await repo.findByRouteId("R001");
    expect(r?.routeId).toBe("R001");
    expect(r?.isBaseline).toBe(true);
    expect(r?.fuelConsumptionT).toBe(5000);
  });

  it("setBaseline wraps updates in transaction (commit)", async () => {
    const pool = makePool();
    pool.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // reset
      .mockResolvedValueOnce({ rowCount: 1 }) // set baseline
      .mockResolvedValueOnce({}); // COMMIT

    const repo = new PgRouteRepository(pool as any);
    await repo.setBaseline("R002");

    expect(pool.query.mock.calls.map((c) => c[0])).toEqual([
      "BEGIN",
      "UPDATE routes SET is_baseline = FALSE",
      "UPDATE routes SET is_baseline = TRUE WHERE route_id = $1",
      "COMMIT",
    ]);
  });

  it("setBaseline rolls back when route does not exist", async () => {
    const pool = makePool();
    pool.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // reset
      .mockResolvedValueOnce({ rowCount: 0 }) // set baseline fails
      .mockResolvedValueOnce({}); // ROLLBACK

    const repo = new PgRouteRepository(pool as any);
    await expect(repo.setBaseline("NOPE")).rejects.toThrow();

    expect(pool.query.mock.calls.map((c) => c[0])).toEqual([
      "BEGIN",
      "UPDATE routes SET is_baseline = FALSE",
      "UPDATE routes SET is_baseline = TRUE WHERE route_id = $1",
      "ROLLBACK",
    ]);
  });
});

