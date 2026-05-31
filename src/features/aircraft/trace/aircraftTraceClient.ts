import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../../config/aviation";
import { withAuditLogging } from "../../../utils/apiLogger";
import { normalizeAircraftHex } from "../../../app/api/_shared/apiProxySecurity";
import { fetchJson } from "../../aviation/httpClient";

const env = typeof process !== "undefined" ? process.env : {};

export const createAircraftTraceClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_AIRCRAFT_TRACE_BASE || AVIATION_PROXY_BASES.aircraftTrace,
} = {}) => {
  if (!fetchImpl) throw new Error("Aircraft trace client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "adsb.lol/AircraftTrace",
  });

  return {
    fetchAircraftTrace({ hex, full = false }) {
      const normalizedHex = normalizeAircraftHex(hex);
      if (!normalizedHex) throw new Error("Invalid aircraft trace query");

      const path = `${baseUrl}/${encodeURIComponent(normalizedHex)}${
        full ? "?full=1" : ""
      }`;
      return fetchJson(auditedFetch, path, {
        timeoutMs: AVIATION_REQUEST_TIMEOUT_MS.aircraftTrace,
        // Full traces for long-haul flights can run multi-MB — give the
        // client buffer some headroom too.
        maxBytes: 24 * 1024 * 1024,
      });
    },
  };
};
