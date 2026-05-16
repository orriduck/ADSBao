// Adapter that converts the OurAirports runway rows returned by
// `/api/airport/[ident]` into the runwayMap shape consumed by the airport-map
// annotation layer (see runwayAnnotationModel.js). The CIFP path is US-only,
// so this fallback is what makes non-US airports (LFPG, EGLL, RJAA, …) get
// runway thresholds, centerlines, and end labels on the map.

const sortKey = (ident) => {
  const match = String(ident || "").match(/^(\d{2})([LRC]?)$/);
  if (!match) return String(ident || "");
  return `${match[1]}${match[2]}`;
};

const hasFiniteCoord = (end) =>
  Number.isFinite(end?.lat) && Number.isFinite(end?.lon);

export const buildRunwayMapFromOurAirports = (airport, runways = []) => {
  const normalizedAirport = String(airport || "").trim().toUpperCase();
  if (!Array.isArray(runways) || runways.length === 0) return null;

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
            source: "OurAirports",
            ends: ends.map((end) => end.ident),
          },
        },
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  if (mapped.length === 0) return null;

  return {
    airport: normalizedAirport,
    source: "OurAirports",
    cycle: "",
    runways: mapped,
  };
};
