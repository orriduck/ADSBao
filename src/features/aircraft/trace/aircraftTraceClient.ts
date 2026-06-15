import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../../config/aviation";
import { withAuditLogging } from "../../../utils/apiLogger";
import { normalizeAircraftHex } from "@/server/http/apiProxySecurity";
import { fetchJson } from "../../aviation/httpClient";

const env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {};

export const createAircraftTraceClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.VITE_AIRCRAFT_TRACE_BASE || AVIATION_PROXY_BASES.aircraftTrace,
}: Record<string, any> = {}) => {
  if (!fetchImpl) throw new Error("Aircraft trace client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "adsb.lol/AircraftTrace",
  });

  return {
    fetchAircraftTrace({ hex, full = false }: Record<string, any>) {
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
