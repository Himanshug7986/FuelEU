import type { Pool } from "pg";
import type { BankRepositoryPort } from "../../../core/ports/bankRepository.js";

export class PgBankRepository implements BankRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async totalBankedForYear(shipId: string, year: number): Promise<number> {
    const { rows } = await this.pool.query<{ s: string }>(
      `SELECT COALESCE(SUM(amount_gco2eq), 0)::text AS s FROM bank_entries WHERE ship_id = $1 AND year = $2`,
      [shipId, year]
    );
    return Number(rows[0]?.s ?? 0);
  }

  async insertBankEntry(shipId: string, year: number, amountGco2eq: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO bank_entries (ship_id, year, amount_gco2eq) VALUES ($1, $2, $3)`,
      [shipId, year, amountGco2eq]
    );
  }

  async listEntries(
    shipId: string,
    year: number
  ): Promise<{ id: string; amountGco2eq: number; createdAt: string }[]> {
    const { rows } = await this.pool.query<{
      id: string;
      amount_gco2eq: number;
      created_at: Date;
    }>(
      `SELECT id, amount_gco2eq, created_at FROM bank_entries WHERE ship_id = $1 AND year = $2 ORDER BY created_at`,
      [shipId, year]
    );
    return rows.map((r) => ({
      id: r.id,
      amountGco2eq: r.amount_gco2eq,
      createdAt: r.created_at.toISOString(),
    }));
  }
}
