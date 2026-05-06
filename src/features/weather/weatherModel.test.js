import assert from "node:assert/strict";

import {
  describeCeiling,
  describePressure,
  describeTemperature,
  describeWind,
  formatObsTime,
  getCeilingFeet,
  getMetarTokens,
  getWeatherConditionLabel,
  shouldShowCeilingSlide,
  toNumber,
} from "./weatherModel.js";

const metar = {
  rawClouds: [
    { cover: "SCT", base: "2500" },
    { cover: "BKN", base: "1200" },
  ],
  rawVisib: "10",
};

assert.equal(toNumber("12.5"), 12.5);
assert.equal(toNumber("abc"), null);
assert.equal(getCeilingFeet(metar), 1200);
assert.equal(shouldShowCeilingSlide(metar), true);
assert.equal(shouldShowCeilingSlide({ rawClouds: [], rawVisib: "bad" }), false);

assert.deepEqual(getMetarTokens("METAR KBOS 051854Z 08012KT 10SM FEW040"), [
  { label: "Station", value: "KBOS" },
  { label: "Issued", value: "051854Z" },
  { label: "Wind", value: "08012KT" },
  { label: "Vis", value: "10SM" },
]);

assert.equal(getWeatherConditionLabel(0), "Clear");
assert.equal(getWeatherConditionLabel(999), "Current conditions");
assert.equal(formatObsTime(null), "latest");
assert.match(formatObsTime(1_714_934_400), /^\d{2}:\d{2}$/);

assert.match(describeWind(31, null), /Strong winds/);
assert.match(describeTemperature(15, 2), /fog/);
assert.match(describePressure(null, 999), /Lower pressure/);
assert.match(describeCeiling(800, 10), /Low ceiling/);
