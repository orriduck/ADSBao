import assert from "node:assert/strict";

import {
  formatCeiling,
  formatWind,
  normalizeMetarPayload,
} from "./metarModel.js";

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

assert.equal(formatWind(metar), "080° / 12 kt G18kt");
assert.equal(formatWind({ wdir: "VRB", wspd: 5 }), "VRB / 5 kt");
assert.equal(formatWind({}), "-");
assert.equal(formatCeiling(metar), "BKN 1,700 ft");
assert.equal(formatCeiling({ clouds: [] }), "CLR");

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

assert.deepEqual(normalizeMetarPayload(null), { raw: "", parsed: null });
