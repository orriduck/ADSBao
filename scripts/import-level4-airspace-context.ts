import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_REGION_QUERIES = ["Massachusetts, United States"];
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OPENAIP_BASE_URL = "https://api.core.openaip.net/api";
const AIRSPACE_FIELDS = [
  "_id",
  "name",
  "type",
  "icaoClass",
  "country",
  "geometry",
  "lowerLimit",
  "upperLimit",
  "activeFrom",
  "activeUntil",
  "onDemand",
  "onRequest",
  "byNotam",
  "specialAgreement",
  "requestCompliance",
  "hoursOfOperation",
  "remarks",
  "updatedAt",
].join(",");

function loadDotEnvLocal() {
  const path = ".env.local";
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue
      .replace(/^"(.*)"$/, "$1")
      .replace(/^'(.*)'$/, "$1");
  }
}

const requireEnv = (name: string, value: string | undefined) => {
  if (!value) throw new Error(`${name} is required`);
  return value;
};

function parseRegionQueries() {
  const raw = process.env.LEVEL4_OSM_REGION_QUERIES;
  if (!raw) return DEFAULT_REGION_QUERIES;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_REGION_QUERIES;
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error("LEVEL4_OSM_REGION_QUERIES must be a JSON array");
    return parsed.map((value) => String(value).trim()).filter(Boolean);
  }
  return trimmed.split("||").map((value) => value.trim()).filter(Boolean);
}

async function fetchJson(url: URL, label: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "ADSBao level4 context importer",
      ...headers,
    },
  });
  if (!response.ok) {
    throw new Error(`${label} failed: HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchOsmRegion(query: string) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "geojson");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);
  const payload = await fetchJson(url, `Nominatim ${query}`);
  const feature = payload?.features?.[0];
  if (!feature?.geometry || !feature?.properties?.osm_id) {
    throw new Error(`Nominatim returned no polygon for ${query}`);
  }
  const properties = feature.properties;
  const address = properties.address || {};
  const countryCode = String(address.country_code || "").toUpperCase();
  const name = String(
    address.state ||
      properties.name ||
      properties.display_name?.split(",")?.[0] ||
      query,
  ).trim();
  return {
    osmId: Number(properties.osm_id),
    osmType: String(properties.osm_type || "relation").toLowerCase(),
    name,
    nameEn: name,
    countryCode,
    parentOsmId: null,
    tags: {
      query,
      displayName: properties.display_name || "",
      address,
    },
    geometry: feature.geometry,
    bbox: feature.bbox,
  };
}

async function fetchOpenAipAirspaces({
  bbox,
  apiKey,
}: {
  bbox: number[];
  apiKey: string;
}) {
  const [west, south, east, north] = bbox;
  const url = new URL(`${OPENAIP_BASE_URL}/airspaces`);
  url.searchParams.set("bbox", [west, south, east, north].join(","));
  url.searchParams.set("limit", "500");
  url.searchParams.set("fields", AIRSPACE_FIELDS);
  const payload = await fetchJson(url, "OpenAIP airspaces", {
    "x-openaip-api-key": apiKey,
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

async function upsertRegion(supabase: any, region: Record<string, any>) {
  const { error } = await supabase.rpc("upsert_osm_admin_level4_region_geojson", {
    p_osm_id: region.osmId,
    p_osm_type: region.osmType,
    p_name: region.name,
    p_name_en: region.nameEn,
    p_country_code: region.countryCode,
    p_parent_osm_id: region.parentOsmId,
    p_tags: region.tags,
    p_geojson: region.geometry,
  });
  if (error) throw new Error(`Region upsert failed: ${error.message}`);
}

async function upsertAirspaces(supabase: any, airspaces: Record<string, any>[]) {
  let imported = 0;
  for (const airspace of airspaces) {
    const { error } = await supabase.rpc("upsert_openaip_airspace_geojson", {
      p_payload: airspace,
    });
    if (error) throw new Error(`Airspace upsert failed: ${error.message}`);
    imported += 1;
    if (imported % 25 === 0 || imported === airspaces.length) {
      console.log(`[import-level4-context] Imported ${imported}/${airspaces.length} airspaces`);
    }
  }
}

async function readCount(supabase: any, table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return Number(count) || 0;
}

async function main() {
  loadDotEnvLocal();
  const supabaseUrl = requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  );
  const serviceKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  );
  const openAipApiKey = requireEnv("OPENAIP_API_KEY", process.env.OPENAIP_API_KEY);
  const regionQueries = parseRegionQueries();

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  for (const query of regionQueries) {
    console.log(`[import-level4-context] Fetching OSM region: ${query}`);
    const region = await fetchOsmRegion(query);
    await upsertRegion(supabase, region);
    console.log(`[import-level4-context] Upserted OSM region ${region.osmId} (${region.name})`);

    const bbox = region.bbox || [];
    if (bbox.length !== 4) {
      throw new Error(`OSM region ${region.osmId} did not include a bbox`);
    }
    console.log(`[import-level4-context] Fetching OpenAIP airspaces for ${region.name}`);
    const airspaces = await fetchOpenAipAirspaces({ bbox, apiKey: openAipApiKey });
    await upsertAirspaces(supabase, airspaces);
  }

  const regionCount = await readCount(supabase, "osm_admin_level4_regions");
  const airspaceCount = await readCount(supabase, "openaip_airspaces");
  const aggregationViewCount = await readCount(supabase, "v_level4_airspace_navaids");
  const membershipViewCount = await readCount(supabase, "v_level4_airspace_memberships");
  console.log(
    `[import-level4-context] Done. regions=${regionCount} airspaces=${airspaceCount} ` +
      `v_level4_airspace_navaids=${aggregationViewCount} ` +
      `v_level4_airspace_memberships=${membershipViewCount}`,
  );
}

main().catch((error) => {
  console.error("[import-level4-context] failed:", error);
  process.exit(1);
});
