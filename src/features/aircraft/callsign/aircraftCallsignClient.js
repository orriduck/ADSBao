import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../../config/aviation.js";
import { withAuditLogging } from "../../../utils/apiLogger.js";
import { fetchJson } from "../../aviation/httpClient.js";

const env = typeof process !== "undefined" ? process.env : {};

export const createAircraftCallsignClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_AIRCRAFT_CALLSIGN_BASE ||
    AVIATION_PROXY_BASES.aircraftCallsign,
} = {}) => {
  if (!fetchImpl)
    throw new Error("Aircraft callsign client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "adsb.lol/Callsign",
  });

  return {
    fetchByCallsign({ callsign }) {
      const normalized = String(callsign || "").trim().toUpperCase();
      if (!normalized) {
        throw new Error("Aircraft callsign required");
      }
      return fetchJson(
        auditedFetch,
        `${baseUrl}/${encodeURIComponent(normalized)}`,
        { timeoutMs: AVIATION_REQUEST_TIMEOUT_MS.aircraftCallsign },
      );
    },
  };
};
