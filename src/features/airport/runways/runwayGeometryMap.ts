type RunwayGeometryRecord = Record<string, any>;

const sortKey = (ident: unknown) => {
  const match = String(ident || "").match(/^(\d{2})([LRC]?)$/);
  if (!match) return String(ident || "");
  return `${match[1]}${match[2]}`;
};

const hasFiniteCoord = (end: RunwayGeometryRecord | null | undefined) =>
  Number.isFinite(end?.lat) && Number.isFinite(end?.lon);

export const buildRunwayMapFromGeometries = ({
  airport,
  runways = [],
  source = "Runway geometry",
}: RunwayGeometryRecord = {}) => {
  const normalizedAirport = String(airport || "").trim().toUpperCase();
  if (!normalizedAirport || !Array.isArray(runways) || runways.length === 0) {
    return null;
  }

  const mapped = runways
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
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  if (mapped.length === 0) return null;

  return {
    airport: normalizedAirport,
    source,
    cycle: "",
    runways: mapped,
  };
};
