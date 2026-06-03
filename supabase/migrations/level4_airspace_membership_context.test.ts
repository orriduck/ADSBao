import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260603130208_add_level4_airspace_membership_context.sql",
);
const sql = readFileSync(migrationPath, "utf8");

assert.match(
  sql,
  /create or replace view public\.v_level4_airspace_memberships\s+with \(security_invoker = true\)\s+as/,
);
assert.match(sql, /join public\.openaip_airspaces a/);
assert.match(sql, /r\.geom OPERATOR\(extensions\.&&\) a\.geom/);
assert.match(sql, /extensions\.ST_Intersects\(r\.geom, a\.geom\)/);
assert.match(sql, /extensions\.ST_Covers\(r\.geom, a\.geom\) as fully_contained/);

assert.match(
  sql,
  /create or replace function public\.get_openaip_airspaces_in_bbox\(/,
);
assert.match(sql, /returns table \(\s+openaip_id text,\s+payload jsonb\s+\)/);
assert.match(sql, /a\.geom OPERATOR\(extensions\.&&\) b\.geom/);
assert.doesNotMatch(sql, /a\.geom\s+&&\s+b\.geom/);

assert.match(
  sql,
  /create or replace function public\.get_full_trace_airspace_stats\(/,
);
assert.match(sql, /from jsonb_to_recordset\(coalesce\(p_trace_points, '\[\]'::jsonb\)\)/);
assert.match(sql, /'airspaceIds'/);
assert.match(sql, /'regions'/);
assert.match(sql, /left join public\.v_level4_airspace_memberships m/);
assert.match(sql, /when count\(\*\) = 1 then \(array_agg\(geom order by point_order\)\)\[1\]/);
assert.doesNotMatch(sql, /max\(geom\)/);

assert.match(
  sql,
  /create or replace function public\.upsert_osm_admin_level4_region_geojson\(/,
);
assert.match(
  sql,
  /create or replace function public\.upsert_openaip_airspace_geojson\(/,
);
assert.match(
  sql,
  /revoke all on function public\.upsert_osm_admin_level4_region_geojson/,
);
assert.match(
  sql,
  /revoke all on function public\.upsert_openaip_airspace_geojson\(jsonb\)/,
);
assert.match(sql, /grant execute on function public\.upsert_openaip_airspace_geojson\(jsonb\)\s+to service_role/);

assert.match(sql, /drop table if exists public\.openaip_cache cascade/);
assert.match(sql, /drop table if exists public\.openaip_airports cascade/);

console.log("level4_airspace_membership_context.test.ts ok");
