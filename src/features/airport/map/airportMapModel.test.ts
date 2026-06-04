import assert from "node:assert/strict";

import { ZOOM_AIRPORT, ZOOM_APPROACH } from "../../../utils/airportMapDisplay";
import {
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
  { icao24: "near", lat: 42.3657, lon: -71.0097 },
  { icao24: "airport-ring", lat: 42.3816, lon: -71.0096 },
  { icao24: "near-secondary", lat: 42.58, lon: -70.92 },
  { icao24: "far", lat: 42.55, lon: -71.22 },
  { icao24: "missing", lat: null, lon: -71.22 },
];

assert.equal(resolveDocumentTheme({ getAttribute: () => "light" }), "light");
assert.equal(resolveDocumentTheme({ getAttribute: () => "dark" }), "dark");
assert.equal(resolveDocumentTheme({ getAttribute: () => "sunrise" }), "dark");
assert.equal(resolveDocumentTheme({ getAttribute: () => "sunset" }), "dark");
assert.equal(resolveDocumentTheme({ getAttribute: () => null }), "dark");
assert.equal(isLightMapTheme("light"), true);
assert.equal(isLightMapTheme("sunrise"), false);
assert.equal(isLightMapTheme("sunset"), false);
assert.equal(isLightMapTheme("dark"), false);
assert.equal(isKnownMapTheme("sunrise"), false);
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
  getVisibleAircraft({ aircraft, airportLat: 42.3656, airportLon: -71.0096, zoom: ZOOM_AIRPORT })
    .map((item) => item.icao24),
  ["airport-ring", "near-secondary", "far"],
);

assert.deepEqual(
  getVisibleAircraft({ aircraft, airportLat: 42.3656, airportLon: -71.0096, zoom: ZOOM_APPROACH })
    .map((item) => item.icao24),
  ["near-secondary", "far"],
);

assert.deepEqual(
  getVisibleAircraft({
    aircraft,
    airportLat: 42.3656,
    airportLon: -71.0096,
    nearbyAirports: [{ icao: "KBVY", lat: 42.5842, lon: -70.9165 }],
    zoom: ZOOM_APPROACH,
  }).map((item) => item.icao24),
  ["far"],
);

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
    immersiveModeActive: true,
  }),
  {
    airports: nearbyLayerAirports,
    showAirportBadges: false,
    showRunwayBadges: false,
  },
);

assert.equal(
  shouldRenderSelectedAircraftTrace({
    selectedAircraftId: "abc123",
    selectedAircraft: { icao24: "abc123" },
    immersiveModeActive: false,
  }),
  true,
);

assert.equal(
  shouldRenderSelectedAircraftTrace({
    selectedAircraftId: "abc123",
    selectedAircraft: { icao24: "abc123" },
    immersiveModeActive: true,
  }),
  false,
);

assert.equal(
  shouldRenderSelectedAircraftTrace({
    selectedAircraftId: "",
    selectedAircraft: null,
    immersiveModeActive: false,
  }),
  false,
);

assert.deepEqual(
  resolveNearbyAirportLayerDisplay({
    nearbyAirports: nearbyLayerAirports,
    immersiveModeActive: false,
  }),
  {
    airports: nearbyLayerAirports,
    showAirportBadges: true,
    showRunwayBadges: false,
  },
);
