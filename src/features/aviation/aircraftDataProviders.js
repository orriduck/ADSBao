// Upstream ADS-B providers. Each provider builds its own URLs but the
// payload format is the shared readsb/tar1090 v2 schema, so the proxy passes
// position payloads through untouched. Traces use adsb.lol only — none of
// the alternates expose an equivalent public trace_recent endpoint.

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
  AIRPLANES_LIVE,
]);
export const TRACE_PROVIDER_CHAIN = Object.freeze([ADSB_LOL]);
