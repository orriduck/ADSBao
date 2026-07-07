import assert from "node:assert/strict";

import { ZOOM_AIRPORT, ZOOM_APPROACH } from "../../../utils/airportMapDisplay";
import {
  airportGroundTrafficAltitudeThresholdFtForRadiusNm,
  getMapOverlayTheme,
  getVisibleAircraft,
  isKnownMapTheme,
  isLightMapTheme,
  resolveNearbyAirportLayerDisplay,
  resolveAirportMapInitialCenter,
  resolveAirportMapFocalCenter,
  resolveDocumentTheme,
  shouldRenderSelectedAircraftTrace,
} from "./airportMapModel";

const aircraft = [
  { icao24: "near", lat: 42.3657, lon: -71.0097, altitude: 240 },
  { icao24: "unknown-altitude-near", lat: 42.366, lon: -71.01 },
  { icao24: "overflight", lat: 42.3657, lon: -71.0097, altitude: 35_000 },
  { icao24: "airport-ring", lat: 42.3816, lon: -71.0096, altitude: 700 },
  { icao24: "near-secondary", lat: 42.58, lon: -70.92, altitude: 180 },
  { icao24: "high-secondary", lat: 42.58, lon: -70.92, altitude: 22_000 },
  { icao24: "far", lat: 42.55, lon: -71.22, altitude: 100 },
  { icao24: "missing", lat: null, lon: -71.22 },
];

assert.equal(resolveDocumentTheme({ getAttribute: () => "light" }), "light");
assert.equal(resolveDocumentTheme({ getAttribute: () => "dark" }), "dark");
assert.equal(resolveDocumentTheme({ getAttribute: () => "removed-theme" }), "dark");
assert.equal(resolveDocumentTheme({ getAttribute: () => null }), "dark");
assert.equal(isLightMapTheme("light"), true);
assert.equal(isLightMapTheme("removed-theme"), false);
assert.equal(isLightMapTheme("dark"), false);
assert.equal(isKnownMapTheme("removed-theme"), false);
assert.equal(isKnownMapTheme("unknown"), false);

assert.equal(resolveAirportMapFocalCenter({ lat: null, lon: null }), null);
assert.equal(resolveAirportMapFocalCenter({ lat: 42.3656, lon: null }), null);
assert.deepEqual(resolveAirportMapFocalCenter({ lat: "0", lon: "0" }), {
  lat: 0,
  lon: 0,
});
assert.deepEqual(
  resolveAirportMapInitialCenter({
    focalCenter: null,
    fallbackCenter: { lat: 33.9416, lon: -118.4085 },
    deferUntilFocal: false,
  }),
  { lat: 33.9416, lon: -118.4085 },
);
assert.equal(
  resolveAirportMapInitialCenter({
    focalCenter: null,
    fallbackCenter: { lat: 33.9416, lon: -118.4085 },
    deferUntilFocal: true,
  }),
  null,
);
assert.deepEqual(
  resolveAirportMapInitialCenter({
    focalCenter: { lat: 42.36, lon: -71.01 },
    fallbackCenter: { lat: 33.9416, lon: -118.4085 },
    deferUntilFocal: true,
  }),
  { lat: 42.36, lon: -71.01 },
);

assert.deepEqual(
  getVisibleAircraft({
    aircraft,
    airportLat: 42.3656,
    airportLon: -71.0096,
    airportElevationFt: 19,
    zoom: ZOOM_AIRPORT,
  })
    .map((item) => item.icao24),
  ["overflight", "airport-ring", "near-secondary", "high-secondary", "far"],
);

assert.deepEqual(
  getVisibleAircraft({
    aircraft,
    airportLat: 42.3656,
    airportLon: -71.0096,
    airportElevationFt: 19,
    zoom: ZOOM_APPROACH,
  })
    .map((item) => item.icao24),
  ["overflight", "near-secondary", "high-secondary", "far"],
);

assert.deepEqual(
  getVisibleAircraft({
    aircraft,
    airportLat: 42.3656,
    airportLon: -71.0096,
    airportElevationFt: 19,
    nearbyAirports: [{ icao: "KBVY", lat: 42.5842, lon: -70.9165, elevationFt: 107 }],
    zoom: ZOOM_APPROACH,
  }).map((item) => item.icao24),
  ["overflight", "high-secondary", "far"],
);

assert.equal(airportGroundTrafficAltitudeThresholdFtForRadiusNm(3), 1050);
assert.equal(airportGroundTrafficAltitudeThresholdFtForRadiusNm(0.5), 300);

assert.equal(
  getMapOverlayTheme("light").labelShadowColor,
  "var(--map-label-shadow)",
);
assert.equal(getMapOverlayTheme("dark").attributionColor, "var(--map-attribution)");

const focalCenter = { lat: 42.3656, lon: -71.0096 };
assert.ok(focalCenter);

const nearbyLayerAirports = [
  {
    icao: "KJFK",
    lat: 40.6413,
    lon: -73.7781,
    runwayMap: { airport: "KJFK", runways: [{ id: "04L/22R" }] },
  },
];

assert.deepEqual(
  resolveNearbyAirportLayerDisplay({
    nearbyAirports: nearbyLayerAirports,
    showMapLabels: true,
  }),
  {
    airports: nearbyLayerAirports,
    showAirportBadges: true,
    showRunwayBadges: false,
  },
);

assert.equal(
  shouldRenderSelectedAircraftTrace({
    selectedAircraftId: "abc123",
    selectedAircraft: { icao24: "abc123" },
  }),
  true,
);

assert.equal(
  shouldRenderSelectedAircraftTrace({
    selectedAircraftId: "",
    selectedAircraft: null,
  }),
  false,
);

assert.deepEqual(
  resolveNearbyAirportLayerDisplay({
    nearbyAirports: nearbyLayerAirports,
    showMapLabels: false,
  }),
  {
    airports: nearbyLayerAirports,
    showAirportBadges: true,
    showRunwayBadges: false,
  },
);

// FAA-local-code fields (no ICAO and no IATA) are dropped from the label layer,
// while IATA-only and ICAO-only airports are kept.
const mixedCodeAirports = [
  { icao: "KBED", lat: 42.47, lon: -71.29 },
  { icao: "", iata: "LWM", lat: 42.72, lon: -71.12 },
  { icao: "", iata: "", code: "6B6", localCode: "6B6", lat: 42.46, lon: -71.52 },
  { icao: "", iata: "", code: "NH14", localCode: "NH14", lat: 42.9, lon: -71.4 },
];
assert.deepEqual(
  resolveNearbyAirportLayerDisplay({ nearbyAirports: mixedCodeAirports }).airports,
  [mixedCodeAirports[0], mixedCodeAirports[1]],
);
