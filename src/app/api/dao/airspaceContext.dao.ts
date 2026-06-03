import { createServerSupabaseClient } from "./supabaseClient";
import { mapOpenAipAirspace } from "@/features/airport/openaip/openAipNormalizer";

type AirspaceContextRecord = Record<string, any>;

export const OPENAIP_AIRSPACES_TABLE = "openaip_airspaces";

const numberOrNull = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeTracePoint = (point: AirspaceContextRecord | null | undefined) => {
  const latitude = numberOrNull(point?.lat ?? point?.latitude);
  const longitude = numberOrNull(point?.lon ?? point?.longitude);
  if (
    latitude == null ||
    longitude == null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  const timestampMs = numberOrNull(point?.timestampMs ?? point?.timestamp_ms);
  const altitudeFtMsl = numberOrNull(
    point?.altitude ?? point?.altitudeFtMsl ?? point?.altitude_ft_msl,
  );
  return {
    latitude,
    longitude,
    timestamp_ms: timestampMs,
    altitude_ft_msl: altitudeFtMsl,
  };
};

const normalizeStatsPayload = (payload: AirspaceContextRecord | null | undefined) => ({
  tracePointCount: Math.max(0, Number(payload?.tracePointCount) || 0),
  firstTimestampMs: numberOrNull(payload?.firstTimestampMs),
  lastTimestampMs: numberOrNull(payload?.lastTimestampMs),
  airspaceIds: Array.isArray(payload?.airspaceIds)
    ? payload.airspaceIds.map((value) => String(value || "").trim()).filter(Boolean)
    : [],
  regions: Array.isArray(payload?.regions) ? payload.regions : [],
});

const mapAirspaceRows = (rows: AirspaceContextRecord[] = []) =>
  rows
    .map((row) => mapOpenAipAirspace(row?.payload || row))
    .filter(Boolean);

export function createAirspaceContextRepository({
  supabaseUrl,
  supabaseKey,
  createClientImpl,
}: {
  supabaseUrl?: string;
  supabaseKey?: string;
  createClientImpl?: any;
} = {}) {
  const client = createServerSupabaseClient({
    supabaseUrl,
    supabaseKey,
    createClientImpl,
  });
  if (!client) return null;

  return {
    async readAirspacesInBounds({
      bbox,
      limit = 100,
      altitudeFtMsl = null,
    }: AirspaceContextRecord = {}) {
      const south = numberOrNull(bbox?.south);
      const north = numberOrNull(bbox?.north);
      const west = numberOrNull(bbox?.west);
      const east = numberOrNull(bbox?.east);
      if (south == null || north == null || west == null || east == null) {
        return [];
      }
      const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
      const altitude = numberOrNull(altitudeFtMsl);

      const { data, error } = await client.rpc("get_openaip_airspaces_in_bbox", {
        p_west: west,
        p_south: south,
        p_east: east,
        p_north: north,
        p_limit: safeLimit,
        p_altitude_ft_msl: altitude,
      });

      if (error) {
        throw new Error(`Airspace tile read failed (${error.message})`);
      }

      return mapAirspaceRows(data || []);
    },

    async readFullTraceAirspaceContext({
      tracePoints = [],
      limit = 250,
    }: AirspaceContextRecord = {}) {
      const normalizedTracePoints = Array.isArray(tracePoints)
        ? tracePoints.map(normalizeTracePoint).filter(Boolean)
        : [];
      if (normalizedTracePoints.length === 0) {
        return {
          source: "supabase",
          tracePointCount: 0,
          firstTimestampMs: null,
          lastTimestampMs: null,
          airspaceIds: [],
          regions: [],
          airspaces: [],
        };
      }
      const safeLimit = Math.max(1, Math.min(Number(limit) || 250, 500));

      const { data: statsData, error: statsError } = await client.rpc(
        "get_full_trace_airspace_stats",
        {
          p_trace_points: normalizedTracePoints,
          p_limit: safeLimit,
        },
      );

      if (statsError) {
        throw new Error(`Full-trace airspace stats read failed (${statsError.message})`);
      }

      const stats = normalizeStatsPayload(statsData);
      let airspaces = [];
      if (stats.airspaceIds.length > 0) {
        const { data: airspaceRows, error: airspaceError } = await client
          .from(OPENAIP_AIRSPACES_TABLE)
          .select("openaip_id,payload")
          .in("openaip_id", stats.airspaceIds)
          .limit(safeLimit);

        if (airspaceError) {
          throw new Error(`Full-trace airspace payload read failed (${airspaceError.message})`);
        }
        airspaces = mapAirspaceRows(airspaceRows || []);
      }

      return {
        source: "supabase",
        ...stats,
        airspaces,
      };
    },
  };
}

export function createAirspaceContextRepositoryFromEnv({
  env = process.env,
  createClientImpl,
}: {
  env?: Record<string, string | undefined>;
  createClientImpl?: any;
} = {}) {
  return createAirspaceContextRepository({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey:
      env.SUPABASE_SECRET_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY,
    createClientImpl,
  });
}
