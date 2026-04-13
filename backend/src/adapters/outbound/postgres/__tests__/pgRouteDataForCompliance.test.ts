import { describe, expect, it, vi } from "vitest";
import { PgRouteDataForCompliance } from "../pgRouteDataForCompliance.js";

describe("PgRouteDataForCompliance", () => {
  it("returns null when no rows", async () => {
    const pool = { query: vi.fn(async () => ({ rows: [] })) };
    const a = new PgRouteDataForCompliance(pool as any);
    await expect(a.getPrimaryRouteForShipYear("S", 2024)).resolves.toBeNull();
  });

  it("maps row to domain shape", async () => {
    const pool = { query: vi.fn(async () => ({ rows: [{ ghg_intensity: 88, fuel_consumption_t: 500 }] })) };
    const a = new PgRouteDataForCompliance(pool as any);
    const out = await a.getPrimaryRouteForShipYear("S", 2024);
    expect(out).toEqual({ ghgIntensity: 88, fuelConsumptionT: 500 });
  });
});

