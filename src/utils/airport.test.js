import assert from "node:assert/strict";

import { airportDisplayName, airportSubtitle } from "./airport.js";

const jfk = {
  icao: "KJFK",
  name: "John F. Kennedy International Airport",
  city: "New York",
  country: "US",
};

assert.equal(airportDisplayName(jfk, "en"), "John F. Kennedy International Airport");
assert.equal(airportDisplayName(jfk, "zh-CN"), "约翰·F·肯尼迪国际机场");
assert.equal(airportSubtitle(jfk, "zh-CN"), "🇺🇸 纽约 · 美国");
assert.equal(
  airportDisplayName({ icao: "XXXX", name: "Example Airport" }, "zh-CN"),
  "Example Airport",
);

console.log("airport.test.js: ok");
