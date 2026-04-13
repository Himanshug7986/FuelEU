CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id TEXT NOT NULL UNIQUE,
  ship_id TEXT NOT NULL,
  vessel_type TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  year INT NOT NULL,
  ghg_intensity DOUBLE PRECISION NOT NULL,
  fuel_consumption_t DOUBLE PRECISION NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL,
  total_emissions_t DOUBLE PRECISION NOT NULL,
  is_baseline BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_routes_year ON routes (year);
CREATE INDEX IF NOT EXISTS idx_routes_ship_year ON routes (ship_id, year);

CREATE TABLE IF NOT EXISTS ship_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id TEXT NOT NULL,
  year INT NOT NULL,
  cb_gco2eq DOUBLE PRECISION NOT NULL,
  UNIQUE (ship_id, year)
);

CREATE TABLE IF NOT EXISTS bank_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id TEXT NOT NULL,
  year INT NOT NULL,
  amount_gco2eq DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_ship_year ON bank_entries (ship_id, year);

CREATE TABLE IF NOT EXISTS pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pool_members (
  pool_id UUID NOT NULL REFERENCES pools (id) ON DELETE CASCADE,
  ship_id TEXT NOT NULL,
  cb_before DOUBLE PRECISION NOT NULL,
  cb_after DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (pool_id, ship_id)
);
