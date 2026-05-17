// Builds a stack of concentric L.circle layers around a coordinate, one
// every `intervalNm` out to `maxNm`. Used to visualise distance bands on
// the airport map: the primary focused airport renders 3nm rings out to
// 30nm; each nearby airport renders the same band out to 10nm.
//
// The shape factory is pure (returns the layers; the caller decides
// where to attach them) so both AreaMarker and NearbyAirportLayer can
// reuse it without sharing a React component or Leaflet map handle.

const NM_TO_METERS = 1852;

function ringColors(theme) {
  if (theme === "light") {
    return {
      minor: "rgba(18,21,26,0.10)",
      major: "rgba(18,21,26,0.22)",
    };
  }
  return {
    minor: "rgba(255,255,255,0.10)",
    major: "rgba(255,255,255,0.22)",
  };
}

export function buildAirportRangeRings(
  L,
  { lat, lon, intervalNm, maxNm, theme = "dark" } = {},
) {
  if (
    !L ||
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lon)) ||
    !Number.isFinite(Number(intervalNm)) ||
    intervalNm <= 0 ||
    !Number.isFinite(Number(maxNm)) ||
    maxNm <= 0
  ) {
    return [];
  }

  const { minor, major } = ringColors(theme);
  const rings = [];
  const epsilon = 1e-3;
  // Every third ring is "major" so the user has a visual anchor without
  // needing per-ring labels. With a 3nm interval that lands every 9nm.
  let index = 1;
  for (let radius = intervalNm; radius <= maxNm + epsilon; radius += intervalNm) {
    const isMajor = index % 3 === 0;
    rings.push(
      L.circle([Number(lat), Number(lon)], {
        radius: radius * NM_TO_METERS,
        color: isMajor ? major : minor,
        weight: isMajor ? 0.9 : 0.6,
        dashArray: isMajor ? "4 6" : "2 6",
        fill: false,
        interactive: false,
      }),
    );
    index += 1;
  }
  return rings;
}
