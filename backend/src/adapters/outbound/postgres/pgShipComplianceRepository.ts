import type { Pool } from "pg";
import type { ShipComplianceRepositoryPort } from "../../../core/ports/shipComplianceRepository.js";

export class PgShipComplianceRepository implements ShipComplianceRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async upsertSnapshot(shipId: string, year: number, cbGco2eq: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO ship_compliance (ship_id, year, cb_gco2eq)
       VALUES ($1, $2, $3)
       ON CONFLICT (ship_id, year) DO UPDATE SET cb_gco2eq = EXCLUDED.cb_gco2eq`,
      [shipId, year, cbGco2eq]
    );
  }

  async getSnapshot(shipId: string, year: number): Promise<number | null> {
    const { rows } = await this.pool.query<{ cb_gco2eq: number }>(
      `SELECT cb_gco2eq FROM ship_compliance WHERE ship_id = $1 AND year = $2`,
      [shipId, year]
    );
    return rows[0]?.cb_gco2eq ?? null;
  }

  async listByYear(year: number): Promise<{ shipId: string; cbGco2eq: number }[]> {
    const { rows } = await this.pool.query<{ ship_id: string; cb_gco2eq: number }>(
      `SELECT ship_id, cb_gco2eq FROM ship_compliance WHERE year = $1 ORDER BY ship_id`,
      [year]
    );
    return rows.map((r) => ({ shipId: r.ship_id, cbGco2eq: r.cb_gco2eq }));
  }
}
