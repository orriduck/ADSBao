import { readResponseText } from "@/utils/httpResponse";
import { normalizeCallsign } from "@/utils/callsign";
import { normalizeFlightRoute } from "./flightRouteNormalizer";

export class FlightRouteHttpError extends Error {
  readonly status: number;
  readonly retryAfterMs: number | null;

  constructor({ status, retryAfterMs }: { status: number; retryAfterMs: number | null }) {
    super(`Route lookup HTTP ${status}`);
    this.name = "FlightRouteHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function retryAfterMs(headers: Headers) {
  const raw = headers.get("Retry-After");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

export function createFlightRouteClient({
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  fetchImpl?: typeof fetch;
} = {}) {
  if (!fetchImpl) throw new Error("Flight route client requires fetch support");

  return {
    async fetchRoute(callsign: unknown, { signal }: { signal?: AbortSignal } = {}) {
      const normalized = normalizeCallsign(callsign);
      if (!normalized) return null;
      const response = await fetchImpl(
        `/api/proxy/flight-routes/callsign/${encodeURIComponent(normalized)}`,
        {
          signal,
          headers: { Accept: "application/json" },
        },
      );
      if (!response.ok) {
        throw new FlightRouteHttpError({
          status: response.status,
          retryAfterMs: retryAfterMs(response.headers),
        });
      }
      const body = await readResponseText(response, {
        label: "flight route",
        maxBytes: 128 * 1024,
      });
      try {
        return normalizeFlightRoute(JSON.parse(body));
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error("Expected JSON route response");
        throw error;
      }
    },
  };
}
