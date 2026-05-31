import assert from "node:assert/strict";

import {
  buildOpenAipRunwayMap,
  mapOpenAipAirport,
  mapOpenAipAirspace,
  mapOpenAipFrequency,
  mapOpenAipNavaid,
  rankOpenAipAirports,
} from "./openAipNormalizer";

const kbos = {
  _id: "6261555b5e9ded571045d58f",
  name: "GENERAL EDWARD LAWRENCE LOGAN INTERNATIO",
  icaoCode: "KBOS",
  iataCode: "BOS",
  country: "US",
  type: 3,
  geometry: { type: "Point", coordinates: [-71.0052, 42.3643] },
  elevation: { value: 6, unit: 0 },
  frequencies: [
    {
      _id: "freq-1",
      value: "118.250",
      unit: 2,
      type: 0,
      name: "BOSTON APP",
      primary: false,
      publicUse: true,
    },
  ],
  runways: [
    {
      _id: "rw-04l",
      designator: "04L",
      trueHeading: 40,
      dimension: {
        length: { value: 2396, unit: 0 },
        width: { value: 45, unit: 0 },
      },
      surface: { mainComposite: 0, condition: 0 },
    },
  ],
  updatedAt: "2025-01-02T03:04:05.000Z",
};

const misleadingBos = {
  _id: "other",
  name: "BOSANSKI PETROVAC",
  icaoCode: "LQMP",
  country: "BA",
  type: 2,
  geometry: { type: "Point", coordinates: [16.2822, 44.5739] },
};

{
  const airport = mapOpenAipAirport(kbos);
  assert.equal(airport.ident, "KBOS");
  assert.equal(airport.icao, "KBOS");
  assert.equal(airport.iata, "BOS");
  assert.equal(airport.code, "KBOS");
  assert.equal(airport.name, "GENERAL EDWARD LAWRENCE LOGAN INTERNATIO");
  assert.equal(airport.country, "US");
  assert.equal(airport.lat, 42.3643);
  assert.equal(airport.lon, -71.0052);
  assert.equal(airport.elevationFt, 20);
  assert.equal(airport.source, "openaip");
  assert.equal(airport.openAipId, "6261555b5e9ded571045d58f");
}

{
  const ranked = rankOpenAipAirports([misleadingBos, kbos], "BOS");
  assert.equal(ranked[0].icaoCode, "KBOS");
}

{
  const frequency = mapOpenAipFrequency(kbos.frequencies[0], kbos);
  assert.equal(frequency.id, "freq-1");
  assert.equal(frequency.airportIdent, "KBOS");
  assert.equal(frequency.description, "BOSTON APP");
  assert.equal(frequency.frequencyMhz, 118.25);
  assert.equal(frequency.source, "openaip");
}

{
  const runwayMap = buildOpenAipRunwayMap(kbos);
  assert.equal(runwayMap, null);
}

{
  const navaid = mapOpenAipNavaid({
    _id: "nav-1",
    name: "BOSTON",
    identifier: "BOS",
    type: 4,
    frequency: { value: "112.700", unit: 2 },
    channel: "74X",
    country: "US",
    geometry: { type: "Point", coordinates: [-70.9894, 42.3575] },
    elevation: { value: 18, unit: 0 },
    magneticDeclination: -14.3,
  });
  assert.equal(navaid.id, "nav-1");
  assert.equal(navaid.ident, "BOS");
  assert.equal(navaid.name, "BOSTON");
  assert.equal(navaid.frequencyKhz, 112700);
  assert.equal(navaid.dme.channel, "74X");
  assert.equal(navaid.lat, 42.3575);
  assert.equal(navaid.lon, -70.9894);
  assert.equal(navaid.source, "openaip");
}

{
  const airspace = mapOpenAipAirspace({
    _id: "asp-1",
    name: "BEDFORD CLASS D",
    type: 0,
    icaoClass: 3,
    country: "US",
    lowerLimit: { value: 0, unit: 1, referenceDatum: 0 },
    upperLimit: { value: 2500, unit: 1, referenceDatum: 0 },
    geometry: { type: "Polygon", coordinates: [[[-71, 42], [-70, 42], [-71, 42]]] },
  });
  assert.equal(airspace.id, "asp-1");
  assert.equal(airspace.name, "BEDFORD CLASS D");
  assert.equal(airspace.classLabel, "D");
  assert.equal(airspace.source, "openaip");
  assert.deepEqual(airspace.geometry.type, "Polygon");
}

console.log("openAipNormalizer.test.ts: ok");
