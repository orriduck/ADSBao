import { AIRPORT_MAP_ZOOM } from "../../../config/aviation";

type ReportingPointRecord = Record<string, any>;

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function shouldShowReportingPointLabels(zoom: unknown) {
  const numericZoom = numberOrNull(zoom);
  return numericZoom != null && numericZoom >= AIRPORT_MAP_ZOOM.detail;
}

export const buildReportingPointLabels = (
  points: ReportingPointRecord[] = [],
) =>
  points
    .map((point) => {
      const name = String(point?.name || "").trim();
      const lat = numberOrNull(point?.lat);
      const lon = numberOrNull(point?.lon);
      if (!name || lat === null || lon === null) return null;

      return {
        key: `${point.id ?? name}-${name}`,
        name,
        lat,
        lon,
        compulsory: Boolean(point.compulsory),
        country: String(point.country || ""),
        source: String(point.source || ""),
      };
    })
    .filter(Boolean);
