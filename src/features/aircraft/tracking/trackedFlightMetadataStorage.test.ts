import assert from "node:assert/strict";

import {
  mergeTrackedFlightMetadata,
  readTrackedFlightMetadata,
  writeTrackedFlightMetadata,
} from "./trackedFlightMetadataStorage";

const TRACKED_FLIGHT_METADATA_TTL_MS = 6 * 60 * 60 * 1000;

function installLocalStorage() {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
      removeItem(key) {
        store.delete(key);
      },
    },
  } as any;
  return store;
}

const now = Date.parse("2026-05-26T12:00:00.000Z");
const flightRoute = {
  callsign: "UAL23",
  origin: { icao: "KEWR" },
  destination: { icao: "EGLL" },
  route: { icao: "KEWR-EGLL" },
  source: "flightaware",
};

assert.equal(TRACKED_FLIGHT_METADATA_TTL_MS, 6 * 60 * 60 * 1000);

{
  installLocalStorage();
  writeTrackedFlightMetadata(" ual23 ", {
    aircraft: {
      icao24: " a9178d ",
      type: " b789 ",
      category: " a5 ",
      origin: "KEWR",
      destination: "EGLL",
      route: "NATX DOGAL",
      flightRoute,
    },
    now,
  });

  assert.deepEqual(readTrackedFlightMetadata("UAL23", { now }), {
    icao24: "A9178D",
    type: "B789",
    category: "A5",
    origin: "KEWR",
    destination: "EGLL",
    route: "NATX DOGAL",
    flightRoute,
    updatedAt: now,
  });
}

{
  installLocalStorage();
  writeTrackedFlightMetadata("UAL23", {
    aircraft: { type: "A359", flightRoute },
    now,
  });

  assert.equal(
    readTrackedFlightMetadata("UAL23", {
      now: now + TRACKED_FLIGHT_METADATA_TTL_MS + 1,
    }),
    null,
  );
}

{
  const merged = mergeTrackedFlightMetadata({
    aircraft: {
      callsign: "UAL23",
      icao24: "",
      type: "",
      category: "",
      origin: "",
      destination: "",
      route: "",
      flightRoute: null,
    },
    metadata: {
      icao24: "A9178D",
      type: "B789",
      category: "A5",
      origin: "KEWR",
      destination: "EGLL",
      route: "NATX DOGAL",
      flightRoute,
    },
  });

  assert.equal(merged.icao24, "A9178D");
  assert.equal(merged.type, "B789");
  assert.equal(merged.category, "A5");
  assert.equal(merged.origin, "KEWR");
  assert.equal(merged.destination, "EGLL");
  assert.equal(merged.route, "NATX DOGAL");
  assert.equal(merged.flightRoute, flightRoute);
}

{
  const merged = mergeTrackedFlightMetadata({
    aircraft: {
      callsign: "UAL23",
      icao24: "A11111",
      type: "B78X",
      category: "A5",
      origin: "KJFK",
      destination: "EGLL",
      route: "LIVE ROUTE",
      flightRoute: { source: "live" },
    },
    metadata: {
      icao24: "A9178D",
      type: "B789",
      category: "A4",
      origin: "KEWR",
      destination: "LFPG",
      route: "CACHED ROUTE",
      flightRoute,
    },
  });

  assert.equal(merged.icao24, "A11111");
  assert.equal(merged.type, "B78X");
  assert.equal(merged.category, "A5");
  assert.equal(merged.origin, "KJFK");
  assert.equal(merged.destination, "EGLL");
  assert.equal(merged.route, "LIVE ROUTE");
  assert.deepEqual(merged.flightRoute, { source: "live" });
}

delete globalThis.window;

console.log("trackedFlightMetadataStorage.test.ts ok");
