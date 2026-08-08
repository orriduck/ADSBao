type LatLonTuple = [number, number];

type TraceFitPoint = {
  lat?: unknown;
  lon?: unknown;
};

type TraceFitTrace = {
  tracePoints?: TraceFitPoint[];
};

type TraceFitOptions = {
  traces?: TraceFitTrace[];
  routePath?: Array<TraceFitPoint | [unknown, unknown]>;
  routeEndpoints?: unknown;
  allowRouteOnly?: boolean;
};

function finiteLatLon(lat: unknown, lon: unknown): LatLonTuple | null {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;
  return [latNum, lonNum];
}

function pushFiniteLatLon(points: LatLonTuple[], lat: unknown, lon: unknown) {
  const point = finiteLatLon(lat, lon);
  if (point) points.push(point);
}

// Fitting only needs the geographic envelope, not every persisted sample.
// Keep the actual extrema so the bounds remain exact while a multi-hour
// tracking run contributes at most four Leaflet points.
function traceBoundsPoints(tracePoints: TraceFitPoint[] = []) {
  const usable = tracePoints
    .map((point) => finiteLatLon(point?.lat, point?.lon))
    .filter((point): point is LatLonTuple => Boolean(point));
  if (usable.length <= 4) return usable;

  const extrema = [
    usable.reduce((best, point) => (point[0] < best[0] ? point : best)),
    usable.reduce((best, point) => (point[0] > best[0] ? point : best)),
    usable.reduce((best, point) => (point[1] < best[1] ? point : best)),
    usable.reduce((best, point) => (point[1] > best[1] ? point : best)),
  ];
  return extrema.filter(
    (point, index) =>
      extrema.findIndex(
        (candidate) => candidate[0] === point[0] && candidate[1] === point[1],
      ) === index,
  );
}

export function buildTraceFitPoints({
  traces = [],
  routePath = [],
  routeEndpoints = [],
  allowRouteOnly = false,
}: TraceFitOptions = {}) {
  const points: LatLonTuple[] = [];
  const endpointPoints = Array.isArray(routeEndpoints) ? routeEndpoints : [];

  for (const trace of traces || []) {
    for (const point of traceBoundsPoints(trace?.tracePoints || [])) {
      points.push(point);
    }
  }

  if (points.length > 0 || allowRouteOnly) {
    for (const point of [...(routePath || []), ...endpointPoints]) {
      if (Array.isArray(point)) {
        pushFiniteLatLon(points, point[0], point[1]);
      } else {
        pushFiniteLatLon(points, point?.lat, point?.lon);
      }
    }
  }

  return points;
}

export function resolveTraceFitCenterAnchor(anchor: TraceFitPoint | null | undefined) {
  return finiteLatLon(anchor?.lat, anchor?.lon);
}
