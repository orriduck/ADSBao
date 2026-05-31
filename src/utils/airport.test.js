import assert from "node:assert/strict";

import { AIRPORT_DISCOVERY_TOPICS } from "../config/airportDiscovery.js";
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
assert.equal(
  airportDisplayName(
    {
      icao: "ZSPD",
      name: "Shanghai Pudong International Airport",
      localizedName: "上海浦东国际机场",
    },
    "zh-CN",
  ),
  "上海浦东国际机场",
);
assert.equal(
  airportDisplayName(
    {
      icao: "KDEN",
      name: "Denver International Airport",
      localizedName: "   ",
    },
    "zh-CN",
  ),
  "Denver International Airport",
);

const homepageAirports = AIRPORT_DISCOVERY_TOPICS.flatMap((topic) => topic.airports);
for (const airport of homepageAirports) {
  assert.notEqual(
    airportDisplayName(airport, "zh-CN"),
    airport.name,
    `${airport.icao} homepage airport needs a zh-CN name`,
  );
  assert.notEqual(
    airportSubtitle(airport, "zh-CN"),
    airportSubtitle(airport, "en"),
    `${airport.icao} homepage airport needs a zh-CN city/country subtitle`,
  );
}

console.log("airport.test.js: ok");
