type ReportingPointRecord = Record<string, any>;

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

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
