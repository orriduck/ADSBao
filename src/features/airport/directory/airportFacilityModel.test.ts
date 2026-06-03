import assert from "node:assert/strict";

import {
  mergeAirportFrequencies,
  mergeNearbyNavaids,
} from "./airportFacilityModel";

{
  const frequencies = mergeAirportFrequencies({
    openAipFrequencies: [
      {
        id: "openaip-tower",
        airportIdent: "KBOS",
        type: "TWR",
        description: "Boston Tower",
        frequencyMhz: 128.8,
        source: "openaip",
      },
    ],
    ourAirportsFrequencies: [
      {
        id: 1001,
        airportIdent: "KBOS",
        type: "TOWER",
        description: "BOSTON TOWER",
        frequencyMhz: "128.800",
        source: "ourairports",
      },
      {
        id: 1002,
        airportIdent: "KBOS",
        type: "ATIS",
        description: "ATIS",
        frequencyMhz: 135.0,
        source: "ourairports",
      },
    ],
  });

  assert.equal(frequencies.length, 2);
  assert.equal(frequencies[0].type, "tower");
  assert.equal(frequencies[0].frequencyMHz, 128.8);
  assert.equal(frequencies[0].callsign, "Boston Tower");
  assert.deepEqual(frequencies[0].sources, ["openaip", "ourairports"]);
  assert.equal(frequencies[1].type, "atis");
  assert.equal(frequencies[1].source, "ourairports");
}

{
  const frequencies = mergeAirportFrequencies({
    openAipFrequencies: [
      {
        id: "openaip-ground",
        airportIdent: "KBOS",
        type: "2",
        description: "GND",
        frequencyMhz: 121.9,
        source: "openaip",
      },
      {
        id: "openaip-clearance",
        airportIdent: "KBOS",
        type: "3",
        description: "CLNC DEL",
        frequencyMhz: 121.65,
        source: "openaip",
      },
    ],
  });

  assert.equal(frequencies[0].type, "ground");
  assert.equal(frequencies[1].type, "clearance");
}

{
  const navaids = mergeNearbyNavaids({
    airport: { lat: 42.3656, lon: -71.0096 },
    openAipNavaids: [
      {
        id: "openaip-bos",
        ident: "BOS",
        name: "Boston",
        type: "4",
        frequencyKhz: 112700,
        lat: 42.3575,
        lon: -70.9894,
        source: "openaip",
      },
    ],
    ourAirportsNavaids: [
      {
        id: 86260,
        ident: "BOS",
        name: "BOSTON",
        type: "VOR-DME",
        frequencyKhz: 112700,
        lat: 42.3576,
        lon: -70.9896,
        source: "ourairports",
      },
      {
        id: 93000,
        ident: "LWM",
        name: "LAWRENCE",
        type: "NDB",
        frequencyKhz: 382,
        lat: 42.7392,
        lon: -71.0946,
        source: "ourairports",
      },
    ],
  });

  assert.equal(navaids.length, 2);
  assert.equal(navaids[0].ident, "BOS");
  assert.equal(navaids[0].type, "vordme");
  assert.equal(navaids[0].distanceNm < 1.2, true);
  assert.deepEqual(navaids[0].sources, ["openaip", "ourairports"]);
  assert.equal(navaids[1].ident, "LWM");
  assert.equal(navaids[1].type, "ndb");
  assert.equal(navaids[1].source, "ourairports");
}

console.log("airportFacilityModel.test.ts ok");
