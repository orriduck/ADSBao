// Upstream ADS-B providers. Each provider builds its own URLs for the
// shared v2 schema; payloads from both adsb.lol and adsb.fi are
// readsb/tar1090-compatible, so the position payload passes through
// untouched in the proxy. Traces use adsb.lol only — adsb.fi does not
// expose an equivalent public trace_recent endpoint at this time.

export const ADSB_LOL = Object.freeze({
  id: "adsb.lol",
  label: "adsb.lol",
  buildPositionUrl: ({ lat, lon, distanceNm }) =>
    `https://api.adsb.lol/v2/lat/${encodeURIComponent(
      String(lat),
    )}/lon/${encodeURIComponent(String(lon))}/dist/${encodeURIComponent(
      String(distanceNm),
    )}`,
  buildTraceUrl: ({ hex }) => {
    const lower = String(hex || "").toLowerCase();
    const suffix = lower.slice(-2);
    return `https://adsb.lol/data/traces/${suffix}/trace_recent_${lower}.json`;
  },
});

export const ADSB_FI = Object.freeze({
  id: "adsb.fi",
  label: "adsb.fi",
  buildPositionUrl: ({ lat, lon, distanceNm }) =>
    `https://opendata.adsb.fi/api/v2/lat/${encodeURIComponent(
      String(lat),
    )}/lon/${encodeURIComponent(String(lon))}/dist/${encodeURIComponent(
      String(distanceNm),
    )}`,
  buildTraceUrl: null,
});

export const AIRPLANES_LIVE = Object.freeze({
  id: "airplanes.live",
  label: "airplanes.live",
  buildPositionUrl: ({ lat, lon, distanceNm }) =>
    `https://api.airplanes.live/v2/point/${encodeURIComponent(
      String(lat),
    )}/${encodeURIComponent(String(lon))}/${encodeURIComponent(
      String(distanceNm),
    )}`,
  buildTraceUrl: null,
});

export const POSITION_PROVIDER_CHAIN = Object.freeze([
  ADSB_LOL,
  ADSB_FI,
  AIRPLANES_LIVE,
]);
export const TRACE_PROVIDER_CHAIN = Object.freeze([ADSB_LOL]);
