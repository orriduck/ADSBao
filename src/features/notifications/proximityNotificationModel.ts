// Pure proximity-detection logic for the two notification watchers. Kept
// framework-free (no Notification API, no React) so the "which airport/
// aircraft just crossed into radius" decision is unit-testable without
// mocking the browser.

type AirportRecord = Record<string, unknown>;
type AircraftRecord = Record<string, unknown>;

export type AirportProximityHit = {
  key: string;
  icao: string;
  name: string;
  distanceNm: number;
};

export type AircraftProximityHit = {
  key: string;
  callsign: string;
  distanceNm: number;
  aircraft: AircraftRecord;
};

function toFiniteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function airportProximityKey(airport: AirportRecord): string {
  return String(
    airport?.icao || airport?.ident || airport?.code || "",
  ).trim();
}

export function aircraftProximityKey(aircraft: AircraftRecord): string {
  return String(
    aircraft?.hex || aircraft?.icao24 || aircraft?.callsign || "",
  ).trim();
}

// Here-mode airport-proximity alert fires ONCE per enabled session (never
// per-airport) — the caller gates repeat calls with its own "already fired"
// flag. This just answers "is anything within radius right now", picking
// the closest if several airports qualify so the copy reads naturally.
export function selectAirportProximityHit(
  airports: AirportRecord[] | null | undefined,
  radiusNm: number,
): AirportProximityHit | null {
  if (!Array.isArray(airports) || !(radiusNm > 0)) return null;
  let closest: AirportProximityHit | null = null;
  for (const airport of airports) {
    const distanceNm = toFiniteNumber(airport?.distanceNm);
    if (distanceNm == null || distanceNm > radiusNm) continue;
    const key = airportProximityKey(airport);
    if (!key) continue;
    if (!closest || distanceNm < closest.distanceNm) {
      closest = {
        key,
        icao: key,
        name: String(airport?.name || "").trim(),
        distanceNm,
      };
    }
  }
  return closest;
}

// Aircraft-proximity alert re-fires per aircraft on every new approach event
// (crossing from outside radius to inside), never per-poll while it lingers
// inside. Returns both the freshly-entered hits and the updated "currently
// inside" key set the caller should keep for the next tick.
export function selectNewlyEnteredAircraft(
  aircraftList: AircraftRecord[] | null | undefined,
  radiusNm: number,
  previousInsideKeys: ReadonlySet<string>,
): { hits: AircraftProximityHit[]; insideKeys: Set<string> } {
  const insideKeys = new Set<string>();
  const hits: AircraftProximityHit[] = [];
  if (!Array.isArray(aircraftList) || !(radiusNm > 0)) {
    return { hits, insideKeys };
  }
  for (const aircraft of aircraftList) {
    const distanceNm = toFiniteNumber(aircraft?.distanceNm);
    if (distanceNm == null || distanceNm > radiusNm) continue;
    const key = aircraftProximityKey(aircraft);
    if (!key) continue;
    insideKeys.add(key);
    if (!previousInsideKeys.has(key)) {
      hits.push({
        key,
        callsign: String(aircraft?.callsign || "").trim() || key,
        distanceNm,
        aircraft,
      });
    }
  }
  return { hits, insideKeys };
}
