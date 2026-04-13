import "dotenv/config";
import { createPool as pgCreatePool } from "../db/pool.js";
import { PgRouteRepository } from "../../adapters/outbound/postgres/pgRouteRepository.js";
import { PgRouteDataForCompliance } from "../../adapters/outbound/postgres/pgRouteDataForCompliance.js";
import { PgShipComplianceRepository } from "../../adapters/outbound/postgres/pgShipComplianceRepository.js";
import { PgBankRepository } from "../../adapters/outbound/postgres/pgBankRepository.js";
import { PgPoolRepository } from "../../adapters/outbound/postgres/pgPoolRepository.js";
import { createApp } from "../../adapters/inbound/http/createApp.js";

const port = Number(process.env.PORT) || 4000;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = pgCreatePool(databaseUrl);
const routeRepo = new PgRouteRepository(pool);
const routeData = new PgRouteDataForCompliance(pool);
const complianceRepo = new PgShipComplianceRepository(pool);
const bankRepo = new PgBankRepository(pool);
const poolRepo = new PgPoolRepository(pool);

const app = createApp({
  routeRepo,
  routeData,
  complianceRepo,
  bankRepo,
  poolRepo,
  defaultShipId: process.env.DEFAULT_SHIP_ID || "SHIP-002",
});

app.listen(port, () => {
  console.log(`FuelEU API listening on http://localhost:${port}`);
});
