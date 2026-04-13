import type { Pool } from "pg";
import type { RouteRecord } from "../../../core/domain/route.js";
import type { RouteFilters, RouteRepositoryPort } from "../../../core/ports/routeRepository.js";

type Row = {
  id: string;
  route_id: string;
  ship_id: string;
  vessel_type: string;
  fuel_type: string;
  year: number;
  ghg_intensity: number;
  fuel_consumption_t: number;
  distance_km: number;
  total_emissions_t: number;
  is_baseline: boolean;
};

function mapRow(r: Row): RouteRecord {
  return {
    id: r.id,
    routeId: r.route_id,
    shipId: r.ship_id,
    vesselType: r.vessel_type,
    fuelType: r.fuel_type,
    year: r.year,
    ghgIntensity: r.ghg_intensity,
    fuelConsumptionT: r.fuel_consumption_t,
    distanceKm: r.distance_km,
    totalEmissionsT: r.total_emissions_t,
    isBaseline: r.is_baseline,
  };
}

export class PgRouteRepository implements RouteRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async findAll(filters?: RouteFilters): Promise<RouteRecord[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (filters?.vesselType) {
      conditions.push(`vessel_type = $${i++}`);
      values.push(filters.vesselType);
    }
    if (filters?.fuelType) {
      conditions.push(`fuel_type = $${i++}`);
      values.push(filters.fuelType);
    }
    if (filters?.year !== undefined) {
      conditions.push(`year = $${i++}`);
      values.push(filters.year);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await this.pool.query<Row>(
      `SELECT * FROM routes ${where} ORDER BY route_id`,
      values
    );
    return rows.map(mapRow);
  }

  async findByRouteId(routeId: string): Promise<RouteRecord | null> {
    const { rows } = await this.pool.query<Row>(
      `SELECT * FROM routes WHERE route_id = $1`,
      [routeId]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async setBaseline(routeId: string): Promise<void> {
    await this.pool.query("BEGIN");
    try {
      await this.pool.query(`UPDATE routes SET is_baseline = FALSE`);
      const res = await this.pool.query(`UPDATE routes SET is_baseline = TRUE WHERE route_id = $1`, [
        routeId,
      ]);
      if (res.rowCount === 0) throw new Error("not found");
      await this.pool.query("COMMIT");
    } catch (e) {
      await this.pool.query("ROLLBACK");
      throw e;
    }
  }
}
