export const THREE_OSM_ACCEPTANCE_MIN_ROUTE_TRANSITIONS = 6;

type RouteWorkloadPoint = [number, number];

type RouteWorkloadCandidate = {
  id: string;
  point: RouteWorkloadPoint;
  distanceSquared: number;
};

function finitePoint(lat: unknown, lon: unknown): RouteWorkloadPoint | null {
  if (
    lat == null ||
    lon == null ||
    lat === "" ||
    lon === "" ||
    typeof lat === "boolean" ||
    typeof lon === "boolean"
  ) {
    return null;
  }
  const resolvedLat = Number(lat);
  const resolvedLon = Number(lon);
  return Number.isFinite(resolvedLat) &&
    Number.isFinite(resolvedLon) &&
    Math.abs(resolvedLat) <= 90 &&
    Math.abs(resolvedLon) <= 180
    ? [resolvedLat, resolvedLon]
    : null;
}

export function serializeThreeOsmRoutePath(
  path: Array<[unknown, unknown]> = [],
) {
  return JSON.stringify(
    (Array.isArray(path) ? path : []).flatMap((point) => {
      const resolved = finitePoint(point?.[0], point?.[1]);
      return resolved ? [resolved] : [];
    }),
  );
}

export function parseThreeOsmRoutePathSnapshot(snapshot: string) {
  return JSON.parse(snapshot) as RouteWorkloadPoint[];
}

function candidateId(candidate: Record<string, unknown>, index: number) {
  return String(
    candidate.icao || candidate.iata || candidate.ident || candidate.id || index,
  )
    .trim()
    .toUpperCase();
}

export function resolveThreeOsmRouteWorkload(input: {
  enabled: boolean;
  revision: unknown;
  center?: { lat?: unknown; lon?: unknown } | null;
  nearbyAirports?: Array<Record<string, unknown>>;
}) {
  const revision = Math.max(0, Math.floor(Number(input.revision) || 0));
  const origin = finitePoint(input.center?.lat, input.center?.lon);
  if (!input.enabled || !origin) {
    return {
      active: false,
      revision,
      path: [] as RouteWorkloadPoint[],
      destinationId: "",
    };
  }

  const candidates = (input.nearbyAirports || [])
    .flatMap((candidate, index): RouteWorkloadCandidate[] => {
      const point = finitePoint(candidate.lat, candidate.lon);
      if (!point) return [];
      const latDelta = point[0] - origin[0];
      const lonDelta = point[1] - origin[1];
      const distanceSquared = latDelta ** 2 + lonDelta ** 2;
      if (distanceSquared < 1e-8) return [];
      return [{
        id: candidateId(candidate, index),
        point,
        distanceSquared,
      }];
    })
    .sort(
      (left, right) =>
        left.distanceSquared - right.distanceSquared ||
        left.id.localeCompare(right.id),
    );

  // Alternating between at least two real nearby-airport endpoints proves that
  // route geometry, fit state, tile ownership, and camera state all change.
  // A single endpoint would only rebuild identical geometry and is not evidence.
  if (candidates.length < 2) {
    return {
      active: false,
      revision,
      path: [] as RouteWorkloadPoint[],
      destinationId: "",
    };
  }

  const destination = candidates[revision % candidates.length];
  return {
    active: true,
    revision,
    path: [origin, destination.point],
    destinationId: destination.id,
  };
}

export function threeOsmRouteEndpointMatches(
  path: Array<[unknown, unknown]>,
  guardPoints: Array<[unknown, unknown]>,
) {
  const destination = path.at(-1);
  const guardDestination = guardPoints.at(-1);
  if (!destination || !guardDestination) return false;
  return (
    Math.abs(Number(destination[0]) - Number(guardDestination[0])) < 1e-7 &&
    Math.abs(Number(destination[1]) - Number(guardDestination[1])) < 1e-7
  );
}
