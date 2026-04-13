import type { Pool } from "pg";
import type { RouteDataForCompliancePort } from "../../../core/ports/routeDataForCompliancePort.js";

/** One primary route per ship/year (first by route_id). */
export class PgRouteDataForCompliance implements RouteDataForCompliancePort {
  constructor(private readonly pool: Pool) {}

  async getPrimaryRouteForShipYear(
    shipId: string,
    year: number
  ): Promise<{ ghgIntensity: number; fuelConsumptionT: number } | null> {
    const { rows } = await this.pool.query<{
      ghg_intensity: number;
      fuel_consumption_t: number;
    }>(
      `SELECT ghg_intensity, fuel_consumption_t FROM routes
       WHERE ship_id = $1 AND year = $2
       ORDER BY route_id LIMIT 1`,
      [shipId, year]
    );
    const r = rows[0];
    if (!r) return null;
    return { ghgIntensity: r.ghg_intensity, fuelConsumptionT: r.fuel_consumption_t };
  }
}
