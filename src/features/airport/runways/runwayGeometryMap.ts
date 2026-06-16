type RunwayGeometryRecord = Record<string, any>;

const sortKey = (ident: unknown) => {
  const match = String(ident || "").match(/^(\d{2})([LRC]?)$/);
  if (!match) return String(ident || "");
  return `${match[1]}${match[2]}`;
};

const hasFiniteCoord = (end: RunwayGeometryRecord | null | undefined) =>
  Number.isFinite(end?.lat) && Number.isFinite(end?.lon);

const runwayCompletenessScore = (runway: RunwayGeometryRecord) => {
  let score = 0;
  if (Number.isFinite(runway.lengthFt)) score += 2;
  if (Number.isFinite(runway.widthFt)) score += 1;
  if (runway.centerline?.geometry?.coordinates?.length >= 2) score += 1;
  return score;
};

const dedupeRunwaysByPhysicalId = (runways: RunwayGeometryRecord[]) => {
  const byId = new Map<string, RunwayGeometryRecord>();
  for (const runway of runways) {
    const existing = byId.get(runway.id);
    if (!existing || runwayCompletenessScore(runway) > runwayCompletenessScore(existing)) {
      byId.set(runway.id, runway);
    }
  }
  return [...byId.values()];
};

export const buildRunwayMapFromGeometries = ({
  airport,
  runways = [],
  source = "Runway geometry",
}: RunwayGeometryRecord = {}) => {
  const normalizedAirport = String(airport || "").trim().toUpperCase();
  if (!normalizedAirport || !Array.isArray(runways) || runways.length === 0) {
    return null;
  }

  const mapped = dedupeRunwaysByPhysicalId(
    runways
      .filter((row) => !row?.closed)
      .filter((row) => row?.le?.ident && row?.he?.ident)
      .filter((row) => hasFiniteCoord(row.le) && hasFiniteCoord(row.he))
      .map((row) => {
        const ends = [
          { ident: String(row.le.ident).toUpperCase(), lat: row.le.lat, lon: row.le.lon },
          { ident: String(row.he.ident).toUpperCase(), lat: row.he.lat, lon: row.he.lon },
        ].sort((left, right) => sortKey(left.ident).localeCompare(sortKey(right.ident)));
        const id = ends.map((end) => end.ident).join("/");
        return {
          id,
          lengthFt: row.lengthFt ?? null,
          widthFt: row.widthFt ?? null,
          ends,
          centerline: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: ends.map((end) => [end.lon, end.lat]),
            },
            properties: {
              id,
              airport: normalizedAirport,
              source,
              ends: ends.map((end) => end.ident),
            },
          },
        };
      }),
  )
    .sort((left, right) => left.id.localeCompare(right.id));

  if (mapped.length === 0) return null;

  return {
    airport: normalizedAirport,
    source,
    cycle: "",
    runways: mapped,
  };
};
