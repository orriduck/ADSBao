import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260603132325_add_altitude_aware_airspace_context.sql",
);
const sql = readFileSync(migrationPath, "utf8");

assert.match(sql, /create or replace function public\.openaip_limit_ft_msl/);
assert.match(sql, /then nullif\(p_limit->>'value', ''\)::double precision \* 100/);
assert.match(sql, /then nullif\(p_limit->>'value', ''\)::double precision \* 3\.280839895/);
assert.match(sql, /create or replace function public\.openaip_airspace_matches_altitude/);
assert.match(sql, /p_altitude_ft_msl is null/);
assert.match(sql, /public\.openaip_limit_ft_msl\(p_lower_limit\)/);
assert.match(sql, /public\.openaip_limit_ft_msl\(p_upper_limit\)/);

assert.match(
  sql,
  /drop function if exists public\.get_openaip_airspaces_in_bbox\(\s+double precision,\s+double precision,\s+double precision,\s+double precision,\s+integer\s+\)/,
);
assert.match(sql, /p_altitude_ft_msl double precision default null/);
assert.match(
  sql,
  /public\.openaip_airspace_matches_altitude\(\s+a\.lower_limit,\s+a\.upper_limit,\s+p_altitude_ft_msl\s+\)/,
);

assert.match(sql, /altitude_ft_msl double precision/);
assert.match(
  sql,
  /public\.openaip_airspace_matches_altitude\(\s+a\.lower_limit,\s+a\.upper_limit,\s+p\.altitude_ft_msl\s+\)/,
);
assert.match(sql, /'matchedAirspaceCount'/);
assert.doesNotMatch(sql, /ST_MakeLine/);

console.log("altitude_aware_airspace_context.test.ts ok");
