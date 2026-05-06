import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";

export const shouldShowRunwayEndLabels = (zoom) => Number(zoom) > ZOOM_APPROACH;

export function buildRunwayEndLabels(runwayMap, { zoom } = {}) {
  if (zoom != null && !shouldShowRunwayEndLabels(zoom)) return [];

  return (runwayMap?.runways || []).flatMap((runway) =>
    (runway.ends || [])
      .filter((end) => Number.isFinite(end.lat) && Number.isFinite(end.lon))
      .map((end) => ({
        key: `${runway.id}-${end.ident}`,
        runwayId: runway.id,
        ident: end.ident,
        lat: end.lat,
        lon: end.lon,
      })),
  );
}

export function buildRunwayCenterlineCollection(runwayMap) {
  return {
    type: "FeatureCollection",
    properties: {
      airport: runwayMap?.airport || "",
      source: runwayMap?.source || "FAA CIFP",
      cycle: runwayMap?.cycle || "",
    },
    features: (runwayMap?.runways || [])
      .map((runway) => runway.centerline)
      .filter(
        (centerline) =>
          centerline?.type === "Feature" &&
          centerline.geometry?.type === "LineString",
      ),
  };
}
