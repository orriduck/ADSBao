import assert from "node:assert/strict";

import {
  normalizeMetarPayload,
} from "./metarModel";

const metar = {
  rawOb: "KBOS 061900Z 08012G18KT 10SM BKN017 14/08 A3002",
  wdir: 80,
  wspd: 12,
  wgst: 18,
  visib: "10",
  temp: 14,
  dewp: 8,
  altim: 30.02,
  clouds: [
    { cover: "SCT", base: 800 },
    { cover: "BKN", base: 1700 },
  ],
  flightCategory: "VFR",
  obsTime: 1_714_934_400,
};

assert.deepEqual(normalizeMetarPayload([metar]), {
  raw: metar.rawOb,
  parsed: {
    wind: "080° / 12 kt G18kt",
    vis: "10 SM",
    temp: "14°C",
    dew: "8°C",
    altim: "30.02 inHg",
    ceiling: "BKN 1,700 ft",
    wxString: "",
    flightCategory: "VFR",
    obsTime: 1_714_934_400,
    rawTemp: 14,
    rawDewp: 8,
    rawVisib: 10,
    rawAltim: 30.02,
    rawWspd: 12,
    rawWgst: 18,
    rawClouds: metar.clouds,
    rawWdir: 80,
    rawWvrb: false,
  },
});

assert.deepEqual(normalizeMetarPayload({ wdir: "VRB", wspd: 5, clouds: [] }).parsed, {
  wind: "VRB / 5 kt",
  vis: "-",
  temp: "-",
  dew: "-",
  altim: "-",
  ceiling: "CLR",
  wxString: "",
  flightCategory: "",
  obsTime: "",
  rawTemp: null,
  rawDewp: null,
  rawVisib: null,
  rawAltim: null,
  rawWspd: 5,
  rawWgst: null,
  rawClouds: [],
  rawWdir: null,
  rawWvrb: true,
});

assert.equal(normalizeMetarPayload({}).parsed.wind, "-");
assert.deepEqual(normalizeMetarPayload(null), { raw: "", parsed: null });
