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
  buildCallsignUrl: ({ callsign }) =>
    `https://api.adsb.lol/v2/callsign/${encodeURIComponent(
      String(callsign || "").toUpperCase(),
    )}`,
  buildTraceUrl: ({ hex }) => {
    const lower = String(hex || "").toLowerCase();
    const suffix = lower.slice(-2);
    return `https://adsb.lol/data/traces/${suffix}/trace_recent_${lower}.json`;
  },
  // Full trace = the entire flight from gate to gate. Larger payload
  // than trace_recent (which is just the rolling tail), used when the
  // aircraft tracking page first initializes so the user sees the
  // complete path on load.
  buildFullTraceUrl: ({ hex }) => {
    const lower = String(hex || "").toLowerCase();
    const suffix = lower.slice(-2);
    return `https://adsb.lol/data/traces/${suffix}/trace_full_${lower}.json`;
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
  buildCallsignUrl: ({ callsign }) =>
    `https://api.airplanes.live/v2/callsign/${encodeURIComponent(
      String(callsign || "").toUpperCase(),
    )}`,
  buildTraceUrl: null,
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
  buildCallsignUrl: ({ callsign }) =>
    `https://opendata.adsb.fi/api/v2/callsign/${encodeURIComponent(
      String(callsign || "").toUpperCase(),
    )}`,
  buildTraceUrl: null,
  normalizePositionPayload: (payload) =>
    Array.isArray(payload?.aircraft)
      ? { ...payload, ac: payload.aircraft }
      : payload,
});

// ADSBHub exposes aggregated ADS-B through a whitelisted TCP SBS feed
// (data.adsbhub.org:5002), not a public point-query JSON endpoint that can
// participate in this serverless HTTP provider race.
export const POSITION_PROVIDER_CHAIN = Object.freeze([
  ADSB_LOL,
  AIRPLANES_LIVE,
  ADSB_FI,
]);
export const CALLSIGN_PROVIDER_CHAIN = Object.freeze([
  ADSB_LOL,
  AIRPLANES_LIVE,
  ADSB_FI,
]);
export const TRACE_PROVIDER_CHAIN = Object.freeze([ADSB_LOL]);
