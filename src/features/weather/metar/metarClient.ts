import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../../config/aviation";
import { withAuditLogging } from "../../../utils/apiLogger";
import { fetchJson } from "../../aviation/httpClient";

const env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {};

export const createMetarClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl = env.VITE_METAR_PROXY_BASE || AVIATION_PROXY_BASES.metar,
}: Record<string, any> = {}) => {
  if (!fetchImpl) throw new Error("METAR client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "AviationWeather/METAR",
  });
  const inFlight = new Map<string, Promise<any>>();

  return {
    fetchMetar(icao) {
      const normalized = String(icao || "")
        .trim()
        .toUpperCase();
      if (!normalized) return [];
      const url = `${baseUrl}/${encodeURIComponent(normalized)}`;
      const pending = inFlight.get(url);
      if (pending) return pending;
      const promise = fetchJson(auditedFetch, url, {
        timeoutMs: AVIATION_REQUEST_TIMEOUT_MS.metar,
      }).finally(() => {
        inFlight.delete(url);
      });
      inFlight.set(url, promise);
      return promise;
    },
  };
};
