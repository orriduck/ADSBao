import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const migrationsDir = join(process.cwd(), "supabase", "migrations");

const migrationPath = () => {
  const matches = readdirSync(migrationsDir).filter((entry) =>
    entry.endsWith("_create_level4_osm_aggregation.sql"),
  );
  assert.equal(
    matches.length,
    1,
    "expected exactly one level 4 OSM aggregation migration",
  );
  return join(migrationsDir, matches[0]);
};

const normalizedSql = () =>
  readFileSync(migrationPath(), "utf8").replace(/\s+/g, " ").toLowerCase();

test("level 4 OSM aggregation migration defines spatial tables and indexes", () => {
  const sql = normalizedSql();

  assert.match(sql, /create extension if not exists postgis with schema extensions/);
  assert.match(sql, /create table if not exists public\.osm_admin_level4_regions/);
  assert.match(sql, /admin_level integer not null default 4/);
  assert.match(sql, /constraint osm_admin_level4_regions_admin_level check \(admin_level = 4\)/);
  assert.match(sql, /geom extensions\.geometry\(multipolygon, 4326\) not null/);
  assert.match(sql, /geom_simplified extensions\.geometry\(multipolygon, 4326\)/);
  assert.match(sql, /create index if not exists osm_admin_level4_regions_geom_gix/);
  assert.match(sql, /using gist \(geom\)/);
  assert.match(sql, /create table if not exists public\.openaip_airspaces/);
  assert.match(sql, /geom extensions\.geometry\(geometry, 4326\) not null/);
  assert.match(sql, /create index if not exists openaip_airspaces_geom_gix/);
  assert.match(sql, /alter table public\.navaids add column if not exists geom/);
  assert.match(sql, /st_makepoint\(longitude_deg, latitude_deg\)/);
  assert.match(sql, /create index if not exists navaids_geom_gix/);
  assert.match(sql, /operator\(extensions\.&&\)/);
  assert.doesNotMatch(
    sql,
    /[^)]\s&&\s/,
    "PostGIS bbox operators must be schema-qualified when PostGIS lives in extensions",
  );
});

test("level 4 OSM aggregation migration exposes a normal security-invoker view", () => {
  const sql = normalizedSql();

  assert.match(sql, /create or replace view public\.v_level4_airspace_navaids with \(security_invoker = true\) as/);
  assert.match(sql, /left join public\.navaids n/);
  assert.match(sql, /st_contains\(r\.geom, n\.geom\)/);
  assert.match(sql, /left join public\.openaip_airspaces a/);
  assert.match(sql, /st_intersects\(r\.geom, a\.geom\)/);
  assert.match(sql, /st_covers\(r\.geom, a\.geom\) as fully_contained/);
  assert.match(sql, /jsonb_agg\(/);
  assert.match(sql, /grant select on table public\.v_level4_airspace_navaids to anon, authenticated/);
});
