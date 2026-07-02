import { getDistanceNm } from "../../../utils/aircraftTrafficIntent";

// Leg-boundary detection for historical trace sources. adsb.lol full
// traces cover the whole UTC day and the persisted localStorage trail
// survives 24h, so an airframe that flew several legs (or the same
// callsign that flew yesterday) drags old loops into the current view.
// This model finds the start of the CURRENT leg so the focus trace can
// clip everything before it.
//
// A boundary exists where the aircraft plausibly ended one flight and
// began another:
//   1. hard gap    — hours of silence, unless BOTH endpoints are at
//                    cruise altitude: transoceanic legs lose terrestrial
//                    ADS-B coverage for 3h+ mid-flight, but you cannot
//                    park at FL350. An extreme ceiling still clips —
//                    beyond it even an airborne-looking gap is two
//                    flights (e.g. yesterday's return leg).
//   2. ground gap  — a long gap that starts or ends near the ground
//                    (parked aircraft usually stop broadcasting).
//   3. ground dwell — continuous coverage through a turnaround: a
//                    stationary near-ground stretch long enough to be
//                    "parked", with airborne data after it.
//
// Deliberately NOT a boundary: long gaps at cruise altitude. Oceanic
// legs lose ADS-B coverage for hours mid-flight, and clipping there
// would amputate the visible half of a transoceanic trace.

const TRACE_LEG_HARD_GAP_MS = 3 * 60 * 60 * 1000;
const TRACE_LEG_EXTREME_GAP_MS = 14 * 60 * 60 * 1000;
const TRACE_LEG_GROUND_GAP_MS = 25 * 60 * 1000;
const TRACE_LEG_NEAR_GROUND_ALTITUDE = 3_000;
const TRACE_LEG_CRUISE_ALTITUDE = 18_000;
const TRACE_LEG_GROUND_DWELL_MS = 10 * 60 * 1000;
const TRACE_LEG_STATIONARY_MAX_STEP_NM = 0.05;

type TraceLegPoint = Record<string, any>;

type TraceLegOptions = {
  hardGapMs?: number;
  extremeGapMs?: number;
  groundGapMs?: number;
  nearGroundAltitude?: number;
  cruiseAltitude?: number;
  groundDwellMs?: number;
};

function pointTimestampMs(point: TraceLegPoint) {
  return Number(point?.timestampMs ?? point?.time);
}

function isUsableLegPoint(point: TraceLegPoint) {
  return (
    Number.isFinite(Number(point?.lat)) &&
    Number.isFinite(Number(point?.lon)) &&
    Number.isFinite(pointTimestampMs(point))
  );
}

function isNearGround(point: TraceLegPoint, nearGroundAltitude: number) {
  if (point?.onGround === true) return true;
  const altitude = Number(point?.altitude);
  return Number.isFinite(altitude) && altitude <= nearGroundAltitude;
}

// Cruise requires a confidently-high finite altitude — an unknown
// altitude must not exempt a multi-hour gap from clipping.
function isAtCruise(point: TraceLegPoint, cruiseAltitude: number) {
  if (point?.onGround === true) return false;
  const altitude = Number(point?.altitude);
  return Number.isFinite(altitude) && altitude >= cruiseAltitude;
}

// Returns the timestamp the current leg starts at, or null when the
// points read as one continuous flight. Accepts unsorted, overlapping
// multi-source input (full + persisted + recent concatenated).
export function resolveTraceLegCutoffMs(
  points: TraceLegPoint[] = [],
  {
    hardGapMs = TRACE_LEG_HARD_GAP_MS,
    extremeGapMs = TRACE_LEG_EXTREME_GAP_MS,
    groundGapMs = TRACE_LEG_GROUND_GAP_MS,
    nearGroundAltitude = TRACE_LEG_NEAR_GROUND_ALTITUDE,
    cruiseAltitude = TRACE_LEG_CRUISE_ALTITUDE,
    groundDwellMs = TRACE_LEG_GROUND_DWELL_MS,
  }: TraceLegOptions = {},
) {
  const sorted = (Array.isArray(points) ? points : [])
    .filter(isUsableLegPoint)
    .sort((a, b) => pointTimestampMs(a) - pointTimestampMs(b));
  if (sorted.length < 2) return null;

  let cutoffMs: number | null = null;
  const markBoundary = (timestampMs: number) => {
    if (cutoffMs == null || timestampMs > cutoffMs) cutoffMs = timestampMs;
  };

  // Rules 1 + 2: gaps between consecutive samples.
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const point = sorted[index];
    const gapMs = pointTimestampMs(point) - pointTimestampMs(previous);
    const cruiseToCruise =
      isAtCruise(previous, cruiseAltitude) && isAtCruise(point, cruiseAltitude);
    if (gapMs >= extremeGapMs || (gapMs >= hardGapMs && !cruiseToCruise)) {
      markBoundary(pointTimestampMs(point));
      continue;
    }
    if (
      gapMs >= groundGapMs &&
      (isNearGround(previous, nearGroundAltitude) ||
        isNearGround(point, nearGroundAltitude))
    ) {
      markBoundary(pointTimestampMs(point));
    }
  }

  // Rule 3: stationary near-ground dwell with airborne data after it —
  // a turnaround captured with continuous coverage. The dwell's last
  // sample anchors the new leg (the trace starts where movement starts).
  let lastAirborneIndex = -1;
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    if (!isNearGround(sorted[index], nearGroundAltitude)) {
      lastAirborneIndex = index;
      break;
    }
  }
  let stretchStart = -1;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const point = sorted[index];
    const stepNm = getDistanceNm(
      Number(previous.lat),
      Number(previous.lon),
      Number(point.lat),
      Number(point.lon),
    );
    const stationaryLink =
      isNearGround(previous, nearGroundAltitude) &&
      isNearGround(point, nearGroundAltitude) &&
      stepNm != null &&
      stepNm <= TRACE_LEG_STATIONARY_MAX_STEP_NM;

    if (stationaryLink) {
      if (stretchStart === -1) stretchStart = index - 1;
      continue;
    }
    if (stretchStart !== -1) {
      const dwellEnd = index - 1;
      const dwellMs =
        pointTimestampMs(sorted[dwellEnd]) - pointTimestampMs(sorted[stretchStart]);
      if (dwellMs >= groundDwellMs && dwellEnd < lastAirborneIndex) {
        markBoundary(pointTimestampMs(sorted[dwellEnd]));
      }
      stretchStart = -1;
    }
  }
  // A trailing dwell (aircraft currently parked) never marks a boundary:
  // it has no airborne data after it, so the lastAirborneIndex guard
  // excludes it by construction.

  return cutoffMs;
}
