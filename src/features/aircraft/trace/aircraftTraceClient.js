import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../../config/aviation.js";
import { withAuditLogging } from "../../../utils/apiLogger.js";
import { normalizeAircraftHex } from "../../../app/api/_shared/apiProxySecurity.js";
import { fetchJson } from "../../aviation/httpClient.js";

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
    fetchAircraftTrace({ hex }) {
      const normalizedHex = normalizeAircraftHex(hex);
      if (!normalizedHex) throw new Error("Invalid aircraft trace query");

      return fetchJson(auditedFetch, `${baseUrl}/${encodeURIComponent(normalizedHex)}`, {
        timeoutMs: AVIATION_REQUEST_TIMEOUT_MS.aircraftTrace,
        maxBytes: 6 * 1024 * 1024,
      });
    },
  };
};
