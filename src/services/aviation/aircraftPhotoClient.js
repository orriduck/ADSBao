import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../config/aviation.js";
import { withAuditLogging } from "../../utils/apiLogger.js";
import { normalizeAircraftHex } from "../apiProxySecurity.js";

const env = typeof process !== "undefined" ? process.env : {};

const appendOptionalParam = (url, key, value) => {
  const normalized = String(value || "").trim();
  if (normalized) url.searchParams.set(key, normalized);
};

export const createAircraftPhotoClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_AIRCRAFT_PHOTOS_BASE || AVIATION_PROXY_BASES.aircraftPhotos,
} = {}) => {
  if (!fetchImpl) throw new Error("Aircraft photo client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "planespotters.net/AircraftPhoto",
  });

  return {
    async fetchAircraftPhoto({ hex, registration = "", type = "" }) {
      const normalizedHex = normalizeAircraftHex(hex);
      if (!normalizedHex) throw new Error("Invalid aircraft photo query");

      const url = new URL(
        `${baseUrl}/${encodeURIComponent(normalizedHex)}`,
        globalThis.location?.origin || "http://localhost",
      );
      appendOptionalParam(url, "registration", registration);
      appendOptionalParam(url, "type", type);

      const response = await auditedFetch(url.pathname + url.search, {
        headers: { Accept: "application/json" },
        signal:
          typeof AbortSignal !== "undefined" && AbortSignal.timeout
            ? AbortSignal.timeout(AVIATION_REQUEST_TIMEOUT_MS.aircraftPhoto)
            : undefined,
      });

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  };
};
