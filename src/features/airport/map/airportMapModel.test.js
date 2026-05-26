import assert from "node:assert/strict";

import { ZOOM_AIRPORT, ZOOM_APPROACH } from "../../../utils/airportMapDisplay.js";
import {
  formatCoordinateLabel,
  getMapOverlayTheme,
  getVisibleAircraft,
  resolveAirportMapFocalCenter,
  resolveDocumentTheme,
} from "./airportMapModel.js";

const aircraft = [
  { icao24: "near", lat: 42.3657, lon: -71.0097 },
  { icao24: "near-secondary", lat: 42.58, lon: -70.92 },
  { icao24: "far", lat: 42.55, lon: -71.22 },
  { icao24: "missing", lat: null, lon: -71.22 },
];

assert.equal(resolveDocumentTheme({ getAttribute: () => "light" }), "light");
assert.equal(resolveDocumentTheme({ getAttribute: () => "dark" }), "dark");
assert.equal(resolveDocumentTheme({ getAttribute: () => null }), "dark");

assert.equal(formatCoordinateLabel(42.3656, "lat"), "42.37N");
assert.equal(formatCoordinateLabel(-71.0096, "lon"), "71.01W");
assert.equal(formatCoordinateLabel(0, "lat"), "");

assert.equal(resolveAirportMapFocalCenter({ lat: null, lon: null }), null);
assert.equal(resolveAirportMapFocalCenter({ lat: 42.3656, lon: null }), null);
assert.deepEqual(resolveAirportMapFocalCenter({ lat: "0", lon: "0" }), {
  lat: 0,
  lon: 0,
});

assert.deepEqual(
  getVisibleAircraft({ aircraft, airportLat: 42.3656, airportLon: -71.0096, zoom: ZOOM_AIRPORT })
    .map((item) => item.icao24),
  ["near", "near-secondary", "far"],
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
