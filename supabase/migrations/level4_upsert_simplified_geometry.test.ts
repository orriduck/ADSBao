import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260603131017_fix_level4_upsert_simplified_geometry.sql",
);
const sql = readFileSync(migrationPath, "utf8");

assert.match(sql, /create or replace function public\.upsert_osm_admin_level4_region_geojson/);
assert.match(sql, /extensions\.ST_SimplifyPreserveTopology\(geom, 0\.005\)/);
assert.match(sql, /::extensions\.geometry\(MultiPolygon, 4326\)/);
assert.match(sql, /create or replace function public\.upsert_openaip_airspace_geojson/);
assert.match(sql, /extensions\.ST_SimplifyPreserveTopology\(geom, 0\.002\)/);
assert.match(sql, /::extensions\.geometry\(Geometry, 4326\)/);
assert.match(sql, /revoke all on function public\.upsert_osm_admin_level4_region_geojson/);
assert.match(sql, /grant execute on function public\.upsert_openaip_airspace_geojson\(jsonb\)\s+to service_role/);

console.log("level4_upsert_simplified_geometry.test.ts ok");
