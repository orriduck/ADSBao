type FreshTrackedAircraftResponse = Pick<Response, "json" | "ok" | "status">;

type FreshTrackedAircraftFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<FreshTrackedAircraftResponse>;

const inFlightFreshRequests = new Map<string, Promise<any>>();

// React Strict Mode mounts effects twice in local development. Keep the first
// no-store request alive and share it with the second mount: aborting it after
// the backend has reserved the paid callsign slot makes the replacement request
// fall through to slower providers and can leave the page waiting for the next
// 15-second SSE poll.
export function fetchFreshTrackedAircraftPayload(
  callsign: string,
  {
    fetcher = globalThis.fetch,
  }: {
    fetcher?: FreshTrackedAircraftFetcher;
  } = {},
) {
  const normalizedCallsign = String(callsign || "").trim().toUpperCase();
  if (!normalizedCallsign) {
    return Promise.reject(new Error("Callsign is required"));
  }

  const existing = inFlightFreshRequests.get(normalizedCallsign);
  if (existing) return existing;

  const request = fetcher(
    `/api/proxy/aircraft/callsign/${encodeURIComponent(normalizedCallsign)}?fresh=1`,
    { cache: "no-store" },
  ).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
  inFlightFreshRequests.set(normalizedCallsign, request);

  const clear = () => {
    if (inFlightFreshRequests.get(normalizedCallsign) === request) {
      inFlightFreshRequests.delete(normalizedCallsign);
    }
  };
  void request.then(clear, clear);
  return request;
}
