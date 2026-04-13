import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  const migrationsDir = join(__dirname, "migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const f of files) {
    const sql = readFileSync(join(migrationsDir, f), "utf8");
    console.log("Running", f);
    await client.query(sql);
  }

  const seedPath = join(__dirname, "seed.sql");
  console.log("Seeding");
  await client.query(readFileSync(seedPath, "utf8"));

  await client.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
