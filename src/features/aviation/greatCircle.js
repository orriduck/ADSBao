// Great-circle (orthodromic) interpolation between two lat/lon points.
//
// Used by the predicted-route map layer to draw the line from a tracked
// aircraft to its destination airport as a curved arc instead of a flat
// Mercator-projection straight line. With ~64 samples a transcontinental
// segment renders smooth at every zoom level.

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const toRadians = (deg) => deg * DEG_TO_RAD;
const toDegrees = (rad) => rad * RAD_TO_DEG;

function isFiniteCoord(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// Angular distance between two points on a unit sphere, in radians.
// Uses the haversine form which stays numerically stable for short
// distances where the spherical law of cosines collapses.
export function angularDistance(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lon2 - lon1);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Slerp on the sphere — fraction 0 returns (lat1,lon1), fraction 1
// returns (lat2,lon2), intermediate values land on the great-circle
// path. When the two endpoints are antipodal the path is ambiguous; we
// fall back to linear interpolation in that degenerate case.
function interpolatePoint({ lat1, lon1, lat2, lon2, fraction, d }) {
  if (d === 0) return [lat1, lon1];
  const sinD = Math.sin(d);
  if (sinD === 0) {
    return [
      lat1 + (lat2 - lat1) * fraction,
      lon1 + (lon2 - lon1) * fraction,
    ];
  }
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const lambda1 = toRadians(lon1);
  const lambda2 = toRadians(lon2);
  const A = Math.sin((1 - fraction) * d) / sinD;
  const B = Math.sin(fraction * d) / sinD;
  const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
  const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
  const z = A * Math.sin(phi1) + B * Math.sin(phi2);
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lon = Math.atan2(y, x);
  return [toDegrees(lat), toDegrees(lon)];
}

// Interpolate `steps + 1` evenly spaced points along the great circle
// between (lat1, lon1) and (lat2, lon2). The first point equals the
// start and the last equals the end so consumers can pass the result
// straight to Leaflet polylines without merging endpoints.
//
// Returns [] when any coordinate is invalid or the two endpoints are
// the same point (no line to draw).
export function interpolateGreatCircle(lat1, lon1, lat2, lon2, steps = 64) {
  if (
    !isFiniteCoord(lat1) ||
    !isFiniteCoord(lon1) ||
    !isFiniteCoord(lat2) ||
    !isFiniteCoord(lon2)
  ) {
    return [];
  }
  if (lat1 === lat2 && lon1 === lon2) return [];
  const safeSteps = Math.max(2, Math.floor(steps));
  const d = angularDistance(lat1, lon1, lat2, lon2);
  const points = new Array(safeSteps + 1);
  for (let i = 0; i <= safeSteps; i++) {
    const fraction = i / safeSteps;
    points[i] = interpolatePoint({ lat1, lon1, lat2, lon2, fraction, d });
  }
  return points;
}
