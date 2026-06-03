import assert from "node:assert/strict";

import { enrichAircraftWithAirportContext } from "./airportContextModel";

const airportProfile = {
  icao: "KBOS",
  iata: "BOS",
  lat: 42.3656,
  lon: -71.0096,
};

const volume = {
  id: "openaip-airspace:KBOS:B:AREA-A:70-SFC",
  airportIcao: "KBOS",
  classType: "B",
  name: "BOSTON CLASS B",
  label: "70/SFC",
  floorFtMsl: 0,
  ceilingFtMsl: 7000,
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-71.08, 42.34],
        [-70.95, 42.34],
        [-70.95, 42.45],
        [-71.08, 42.45],
        [-71.08, 42.34],
      ],
    ],
  },
  source: "openaip-airspace",
};

assert.deepEqual(
  {
    id: volume.id,
    airportIcao: volume.airportIcao,
    classType: volume.classType,
    label: volume.label,
    floorFtMsl: volume.floorFtMsl,
    ceilingFtMsl: volume.ceilingFtMsl,
    source: volume.source,
  },
  {
    id: "openaip-airspace:KBOS:B:AREA-A:70-SFC",
    airportIcao: "KBOS",
    classType: "B",
    label: "70/SFC",
    floorFtMsl: 0,
    ceilingFtMsl: 7000,
    source: "openaip-airspace",
  },
);

const enriched = enrichAircraftWithAirportContext({
  airportProfile,
  airspaceVolumes: [volume],
  aircraft: [
    {
      icao24: "arrival",
      callsign: "DAL123",
      lat: 42.43,
      lon: -71.07,
      altitude: 3000,
      movement: "ARRIVAL",
    },
    {
      icao24: "overflight",
      callsign: "UAL456",
      lat: 42.72,
      lon: -70.62,
      altitude: 35_000,
      movement: "UNKNOWN",
    },
    {
      icao24: "ground",
      callsign: "BOSOPS",
      lat: 42.3659,
      lon: -71.009,
      altitude: null,
      onGround: true,
      movement: "UNKNOWN",
    },
    {
      icao24: "terminal-outer",
      callsign: "JBU456",
      distanceNm: 18,
      altitude: 10_500,
      movement: "departure",
    },
    {
      icao24: "unknown-altitude",
      callsign: "NOCONTEXT",
      distanceNm: null,
      altitude: null,
      movement: "UNKNOWN",
    },
  ],
});

assert.equal(enriched[0].airportContext.airportIcao, "KBOS");
assert.equal(enriched[0].airportContext.movement, "arrival");
assert.equal(enriched[0].airportContext.rangeBand, "terminal-inner");
assert.equal(enriched[0].airportContext.altitudeBand, "terminal-low");
assert.equal(enriched[0].airportContext.visibilityRole, "primary");
assert.equal(enriched[0].airportContext.airspace.matched, true);
assert.equal(enriched[0].airportContext.airspace.label, "70/SFC");
assert.equal(enriched[0].airportContext.display.group, "Terminal Flow");
assert.equal(enriched[0].airportContext.display.confidence, "official-airspace-match");

assert.equal(enriched[1].airportContext.altitudeBand, "class-a");
assert.equal(enriched[1].airportContext.visibilityRole, "dimmed");
assert.equal(enriched[1].airportContext.display.group, "High / Passing Over");

assert.equal(enriched[2].airportContext.rangeBand, "airport-core");
assert.equal(enriched[2].airportContext.altitudeBand, "surface-tower");
assert.equal(enriched[2].airportContext.display.group, "Airport Area");

assert.equal(enriched[3].airportContext.rangeBand, "terminal-outer");
assert.equal(enriched[3].airportContext.altitudeBand, "terminal-high");
assert.equal(enriched[3].airportContext.visibilityRole, "primary");
assert.equal(enriched[3].airportContext.display.group, "Terminal Flow");

assert.equal(enriched[4].airportContext.rangeBand, "outside-airport-context");
assert.equal(enriched[4].airportContext.altitudeBand, "unknown");
assert.equal(enriched[4].airportContext.visibilityRole, "dimmed");
assert.equal(enriched[4].airportContext.display.group, "Unknown");
