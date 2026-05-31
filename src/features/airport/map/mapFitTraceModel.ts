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
};

function pushFiniteLatLon(points: LatLonTuple[], lat: unknown, lon: unknown) {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
    points.push([latNum, lonNum]);
  }
}

export function buildTraceFitPoints({
  traces = [],
  routePath = [],
  routeEndpoints = [],
}: TraceFitOptions = {}) {
  const points: LatLonTuple[] = [];
  const endpointPoints = Array.isArray(routeEndpoints) ? routeEndpoints : [];

  for (const trace of traces || []) {
    for (const point of trace?.tracePoints || []) {
      pushFiniteLatLon(points, point?.lat, point?.lon);
    }
  }

  if (points.length > 0) {
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
