export type TrackingRun = {
  id: string;
  status: string;
};

export type TrackingObservation = {
  id: string;
  aircraft?: Record<string, unknown>;
  receivedAt?: string;
};

export type TrackingRunSnapshot = {
  run: TrackingRun | null;
  observations: TrackingObservation[];
  observationCursor: string;
};

type TrackingRunDetailPayload = {
  run?: TrackingRun | null;
  observations?: TrackingObservation[];
  observationCursor?: string;
  observationsHasMore?: boolean;
};

async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers,
  });
  if (!response.ok) throw new Error(`Tracking request failed (${response.status})`);
  return response.json();
}

export async function bootstrapTrackingRun(callsign: string, signal?: AbortSignal): Promise<TrackingRunSnapshot> {
  const lookup = await request(`/api/tracking-runs?callsign=${encodeURIComponent(callsign)}`, { signal });
  let run = validRun(lookup?.run) ? lookup.run : null;
  if (!run) {
    const created = await request("/api/tracking-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callsign }),
      signal,
    });
    run = validRun(created?.run) ? created.run : null;
  }
  if (!run) return { run: null, observations: [], observationCursor: "" };
  return readTrackingObservationPages(run, undefined, signal);
}

export async function readTrackingRunDelta(
  run: TrackingRun,
  observationCursor: string,
  signal?: AbortSignal,
): Promise<TrackingRunSnapshot> {
  if (!observationCursor) throw new Error("Tracking response omitted observation cursor");
  return readTrackingObservationPages(run, observationCursor, signal);
}

async function readTrackingObservationPages(
  initialRun: TrackingRun,
  initialCursor: string | undefined,
  signal?: AbortSignal,
): Promise<TrackingRunSnapshot> {
  let run = initialRun;
  let cursor = initialCursor;
  let observations: TrackingObservation[] = [];

  while (true) {
    const suffix = cursor === undefined ? "" : `?after=${encodeURIComponent(cursor)}`;
    const payload = await request(`/api/tracking-runs/${encodeURIComponent(run.id)}${suffix}`, { signal }) as TrackingRunDetailPayload;
    if (validRun(payload.run)) run = payload.run;
    const page = Array.isArray(payload.observations)
      ? payload.observations.filter(validObservation)
      : [];
    observations = mergeTrackingObservations(observations, page);
    const nextCursor = typeof payload.observationCursor === "string" ? payload.observationCursor : "";
    if (!nextCursor) throw new Error("Tracking response omitted observation cursor");
    if (!payload.observationsHasMore) {
      return { run, observations, observationCursor: nextCursor };
    }
    if (nextCursor === cursor) throw new Error("Tracking observation cursor did not advance");
    cursor = nextCursor;
  }
}

export function mergeTrackingObservations(
  current: TrackingObservation[],
  incoming: TrackingObservation[],
): TrackingObservation[] {
  const byId = new Map(current.map((observation) => [observation.id, observation]));
  for (const observation of incoming) byId.set(observation.id, observation);
  return [...byId.values()].sort((left, right) => {
    const receivedOrder = String(left.receivedAt || "").localeCompare(String(right.receivedAt || ""));
    return receivedOrder || left.id.localeCompare(right.id);
  });
}

function validRun(value: unknown): value is TrackingRun {
  if (!value || typeof value !== "object") return false;
  const run = value as Partial<TrackingRun>;
  return typeof run.id === "string" && run.id.length > 0 && typeof run.status === "string";
}

function validObservation(value: unknown): value is TrackingObservation {
  return Boolean(value && typeof value === "object" && typeof (value as Partial<TrackingObservation>).id === "string");
}
