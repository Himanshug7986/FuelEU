-- Re-running `npm run migrate` will UPSERT these rows so edits to this file take effect.
INSERT INTO routes (
  route_id, ship_id, vessel_type, fuel_type, year,
  ghg_intensity, fuel_consumption_t, distance_km, total_emissions_t, is_baseline
) VALUES
  ('R001', 'SHIP-001', 'Container', 'HFO', 2024, 91.0, 5000, 12000, 4500, TRUE),
  ('R002', 'SHIP-002', 'BulkCarrier', 'LNG', 2024, 88.0, 4800, 11500, 4200, FALSE),
  ('R003', 'SHIP-003', 'Tanker', 'MGO', 2024, 93.5, 5100, 12500, 4700, FALSE),
  ('R004', 'SHIP-004', 'RoRo', 'HFO', 2025, 88.2, 4900, 11800, 4300, FALSE),
  ('R005', 'SHIP-005', 'Container', 'LNG', 2025, 90.0, 4900, 11900, 4300, FALSE)
ON CONFLICT (route_id) DO UPDATE SET
  ship_id = EXCLUDED.ship_id,
  vessel_type = EXCLUDED.vessel_type,
  fuel_type = EXCLUDED.fuel_type,
  year = EXCLUDED.year,
  ghg_intensity = EXCLUDED.ghg_intensity,
  fuel_consumption_t = EXCLUDED.fuel_consumption_t,
  distance_km = EXCLUDED.distance_km,
  total_emissions_t = EXCLUDED.total_emissions_t,
  is_baseline = EXCLUDED.is_baseline;

-- Initial CB from formula (Target 89.3368): (89.3368 - ghg) * fuel_t * 41000
-- UPSERT keeps CB in sync with route rows after you change seed data (overwrites prior CB for these keys).
INSERT INTO ship_compliance (ship_id, year, cb_gco2eq)
SELECT ship_id, year,
  (89.3368 - ghg_intensity) * fuel_consumption_t * 41000
FROM routes
ON CONFLICT (ship_id, year) DO UPDATE SET
  cb_gco2eq = EXCLUDED.cb_gco2eq;
