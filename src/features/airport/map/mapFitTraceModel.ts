function pushFiniteLatLon(points, lat, lon) {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
    points.push([latNum, lonNum]);
  }
}

export function buildTraceFitPoints({ traces = [], routePath = [] } = {}) {
  const points = [];
  for (const trace of traces || []) {
    for (const point of trace?.tracePoints || []) {
      pushFiniteLatLon(points, point?.lat, point?.lon);
    }
  }

  if (points.length > 0) {
    for (const point of routePath || []) {
      if (Array.isArray(point)) {
        pushFiniteLatLon(points, point[0], point[1]);
      } else {
        pushFiniteLatLon(points, point?.lat, point?.lon);
      }
    }
  }

  return points;
}
