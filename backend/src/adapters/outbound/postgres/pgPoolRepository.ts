import type { Pool } from "pg";
import type { PoolRepositoryPort } from "../../../core/ports/poolRepository.js";

export class PgPoolRepository implements PoolRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async createPool(
    year: number,
    members: { shipId: string; cbBefore: number; cbAfter: number }[]
  ): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO pools (year) VALUES ($1) RETURNING id`,
        [year]
      );
      const poolId = rows[0].id;
      for (const m of members) {
        await client.query(
          `INSERT INTO pool_members (pool_id, ship_id, cb_before, cb_after) VALUES ($1, $2, $3, $4)`,
          [poolId, m.shipId, m.cbBefore, m.cbAfter]
        );
        await client.query(
          `INSERT INTO ship_compliance (ship_id, year, cb_gco2eq)
           VALUES ($1, $2, $3)
           ON CONFLICT (ship_id, year) DO UPDATE SET cb_gco2eq = EXCLUDED.cb_gco2eq`,
          [m.shipId, year, m.cbAfter]
        );
      }
      await client.query("COMMIT");
      return poolId;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}
