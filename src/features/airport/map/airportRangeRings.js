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
  // Two roles: `stroke` is the ring line itself; `band` is a very low
  // alpha fill applied to the MAJOR rings so the user sees alternating
  // shaded bands between major boundaries. Leaflet draws layers in the
  // order they're added, so the factory below renders outer → inner;
  // each major's disk then overlaps the previous, producing widening
  // concentric shadings.
  if (theme === "light") {
    return {
      minorStroke: "rgba(18,21,26,0.22)",
      majorStroke: "rgba(18,21,26,0.45)",
      band: "rgba(18,21,26,0.05)",
    };
  }
  return {
    minorStroke: "rgba(255,255,255,0.22)",
    majorStroke: "rgba(255,255,255,0.45)",
    band: "rgba(255,255,255,0.05)",
  };
}

export function buildAirportRangeRings(
  L,
  { lat, lon, intervalNm, maxNm, theme = "dark", shaded = true } = {},
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

  const { minorStroke, majorStroke, band } = ringColors(theme);
  const epsilon = 1e-3;

  // Collect the ring radii first so we can render outer → inner. With
  // a 3nm interval the third ring (and every third afterward) becomes
  // a "major" anchor, drawn with a stronger stroke. Even-indexed
  // majors also get a faint fill — since we draw outer first, each
  // successive fill stacks on top of the disk underneath, producing
  // alternating shaded bands between major boundaries.
  const radii = [];
  for (let r = intervalNm; r <= maxNm + epsilon; r += intervalNm) {
    radii.push(r);
  }

  const layers = [];
  for (let i = radii.length - 1; i >= 0; i -= 1) {
    const ringIndex = i + 1; // 1-based so the third ring is major
    const isMajor = ringIndex % 3 === 0;
    const isShadedBand =
      shaded && isMajor && Math.floor(ringIndex / 3) % 2 === 1;
    layers.push(
      L.circle([Number(lat), Number(lon)], {
        radius: radii[i] * NM_TO_METERS,
        color: isMajor ? majorStroke : minorStroke,
        weight: isMajor ? 1.2 : 0.8,
        dashArray: isMajor ? "5 5" : "2 6",
        fill: isShadedBand,
        fillColor: isShadedBand ? band : undefined,
        fillOpacity: isShadedBand ? 1 : 0,
        interactive: false,
      }),
    );
  }
  return layers;
}
