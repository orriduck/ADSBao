import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../../config/aviation";
import { withAuditLogging } from "../../../utils/apiLogger";
import { fetchJson } from "../../aviation/httpClient";

const env = typeof process !== "undefined" ? process.env : {};

export const createMetarClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl = env.NEXT_PUBLIC_METAR_PROXY_BASE || AVIATION_PROXY_BASES.metar,
} = {}) => {
  if (!fetchImpl) throw new Error("METAR client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "AviationWeather/METAR",
  });

  return {
    fetchMetar(icao) {
      const normalized = String(icao || "")
        .trim()
        .toUpperCase();
      if (!normalized) return [];
      return fetchJson(
        auditedFetch,
        `${baseUrl}/${encodeURIComponent(normalized)}`,
        {
          timeoutMs: AVIATION_REQUEST_TIMEOUT_MS.metar,
        },
      );
    },
  };
};
