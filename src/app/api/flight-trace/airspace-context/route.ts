import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity";
import { createAirspaceContextRepositoryFromEnv } from "@/app/api/dao/airspaceContext.dao";
import { AirportDirectoryConfigurationError } from "@/features/airport/directory/airportDirectory.models";

const rateLimit = {
  key: "api:flight-trace-airspace-context",
  maxRequests: 60,
  windowMs: 60_000,
};
const corsOptions = {
  allowedMethods: ["POST", "OPTIONS"],
};
const MAX_TRACE_POINTS = 500;

export const runtime = "nodejs";

const numberOrNull = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

function normalizeTracePoint(point: Record<string, any> | null | undefined) {
  const lat = numberOrNull(point?.lat);
  const lon = numberOrNull(point?.lon);
  if (
    lat == null ||
    lon == null ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }
  return {
    lat,
    lon,
    timestampMs: numberOrNull(point?.timestampMs),
    altitude: numberOrNull(point?.altitude),
  };
}

export function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, corsOptions);
}

export async function POST(request: Request) {
  const securityResponse = enforceProxyRequest(request, {
    rateLimit,
    ...corsOptions,
  });
  if (securityResponse) return securityResponse;

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return jsonProxyResponse(
      request,
      { error: "Invalid JSON body" },
      { status: 400 },
      corsOptions,
    );
  }

  const tracePoints = Array.isArray(body?.tracePoints)
    ? body.tracePoints
        .slice(-MAX_TRACE_POINTS)
        .map(normalizeTracePoint)
        .filter(Boolean)
    : [];

  if (tracePoints.length === 0) {
    return jsonProxyResponse(
      request,
      {
        source: "supabase",
        tracePointCount: 0,
        firstTimestampMs: null,
        lastTimestampMs: null,
        airspaceIds: [],
        regions: [],
        airspaces: [],
      },
      {},
      corsOptions,
    );
  }

  try {
    const repository = createAirspaceContextRepositoryFromEnv();
    if (!repository?.readFullTraceAirspaceContext) {
      throw new AirportDirectoryConfigurationError("Supabase airspace data is not configured");
    }
    const payload = await repository.readFullTraceAirspaceContext({
      tracePoints,
      limit: 250,
    });
    return jsonProxyResponse(request, payload, {}, corsOptions);
  } catch (error) {
    if (error instanceof AirportDirectoryConfigurationError) {
      return jsonProxyResponse(
        request,
        { error: error.message },
        { status: error.status },
        corsOptions,
      );
    }
    console.error("[api/flight-trace/airspace-context] load failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load flight trace airspace context" },
      { status: 502 },
      corsOptions,
    );
  }
}
