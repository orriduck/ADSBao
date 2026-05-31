// Pure factory: returns L.circle layers for a concentric distance
// band. Both AreaMarker and NearbyAirportLayer attach what comes back
// to their own layer group.

const NM_TO_METERS = 1852;

type RangeRingOptions = Record<string, any>;

function ringColors(theme: unknown) {
  if (theme === "light") {
    return {
      minorStroke: "var(--airport-range-ring-minor)",
      majorStroke: "var(--airport-range-ring-major)",
      band: "var(--airport-range-ring-band)",
    };
  }
  return {
    minorStroke: "var(--airport-range-ring-minor)",
    majorStroke: "var(--airport-range-ring-major)",
    band: "var(--airport-range-ring-band)",
  };
}

export function buildAirportRangeRings(
  L: any,
  {
    lat,
    lon,
    intervalNm,
    maxNm,
    theme = "dark",
    shaded = true,
    prominent = false,
  }: RangeRingOptions = {},
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

  // Render outer → inner so successive shaded-band fills stack on top
  // of the wider disk underneath, producing concentric shadings.
  const radii = [];
  for (let r = intervalNm; r <= maxNm + epsilon; r += intervalNm) {
    radii.push(r);
  }

  const layers = [];
  for (let i = radii.length - 1; i >= 0; i -= 1) {
    const ringIndex = i + 1;
    const isMajor = prominent || ringIndex % 3 === 0;
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

// Distance labels ("3 NM", "6 NM"…) anchored due-east of center so
// they stack vertically like ruler ticks. Major rings get a bolder
// treatment. Callers gate display on zoom.
const EARTH_LAT_METERS_PER_DEG = 111139;

export function buildAirportRangeRingLabels(
  L: any,
  { lat, lon, intervalNm, maxNm, theme = "dark" }: RangeRingOptions = {},
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

  const cosLat = Math.cos((Number(lat) * Math.PI) / 180) || 1;
  const lonMetersPerDeg = EARTH_LAT_METERS_PER_DEG * cosLat;
  const epsilon = 1e-3;
  const labels = [];

  let ringIndex = 1;
  for (let r = intervalNm; r <= maxNm + epsilon; r += intervalNm) {
    const isMajor = ringIndex % 3 === 0;
    const lonOffsetDeg = (r * NM_TO_METERS) / lonMetersPerDeg;
    const themeSuffix = theme === "light" ? "light" : "dark";
    const majorClass = isMajor
      ? "airport-range-ring-label--major"
      : "airport-range-ring-label--minor";
    labels.push(
      L.marker([Number(lat), Number(lon) + lonOffsetDeg], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: `airport-range-ring-label airport-range-ring-label--${themeSuffix} ${majorClass}`,
          html: `<span>${r} NM</span>`,
          iconSize: [44, 14],
          iconAnchor: [22, 7],
        }),
      }),
    );
    ringIndex += 1;
  }
  return labels;
}
