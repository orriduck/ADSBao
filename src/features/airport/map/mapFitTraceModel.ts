function pushFiniteLatLon(points: any[], lat: unknown, lon: unknown) {
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
}: Record<string, any> = {}) {
  const points = [];
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
