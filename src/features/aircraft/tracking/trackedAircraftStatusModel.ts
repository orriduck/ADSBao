import { resolveLastSuccessfulPositionDate } from "../positions/aircraftPositionsModel";

type TrackingRecord = Record<string, any>;

function parseDate(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  const timestamp = Number.isFinite(number)
    ? number < 10_000_000_000
      ? Math.round(number * 1000)
      : Math.round(number)
    : Date.parse(String(value));
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

export function resolveTrackedAircraftStatusUpdatedDate({
  aircraft = null,
  fetchedAt = "",
}: {
  aircraft?: TrackingRecord | null;
  fetchedAt?: unknown;
  feedSource?: unknown;
  trackingState?: TrackingRecord | null;
} = {}) {
  const fetchedDate =
    parseDate(fetchedAt) || parseDate(aircraft?.positionQuality?.fetchedAt);
  if (fetchedDate) return fetchedDate;

  return aircraft ? resolveLastSuccessfulPositionDate(aircraft) : null;
}
