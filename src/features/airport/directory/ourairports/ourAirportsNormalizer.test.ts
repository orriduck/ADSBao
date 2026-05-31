import assert from "node:assert/strict";

import {
  normalizeAirportRow,
  normalizeAirports,
  normalizeFrequencyRow,
  normalizeNavaidRow,
  normalizeRunwayRow,
} from "./ourAirportsNormalizer";

const kbos = normalizeAirportRow({
  id: "3670",
  ident: "kbos",
  type: "large_airport",
  name: "General Edward Lawrence Logan International Airport",
  latitude_deg: "42.36429977",
  longitude_deg: "-71.00520325",
  elevation_ft: "20",
  continent: "NA",
  iso_country: "us",
  iso_region: "us-ma",
  municipality: "Boston",
  scheduled_service: "yes",
  icao_code: "KBOS",
  iata_code: "bos",
  gps_code: "KBOS",
  local_code: "BOS",
  home_link: "",
  wikipedia_link: "https://en.wikipedia.org/wiki/Logan_International_Airport",
  keywords: "",
});

assert.deepEqual(kbos, {
  ident: "KBOS",
  ourairports_id: 3670,
  type: "large_airport",
  name: "General Edward Lawrence Logan International Airport",
  latitude_deg: 42.36429977,
  longitude_deg: -71.00520325,
  elevation_ft: 20,
  continent: "NA",
  iso_country: "US",
  iso_region: "US-MA",
  municipality: "Boston",
  scheduled_service: true,
  icao_code: "KBOS",
  iata_code: "BOS",
  gps_code: "KBOS",
  local_code: "BOS",
  home_link: "",
  wikipedia_link: "https://en.wikipedia.org/wiki/Logan_International_Airport",
  keywords: "",
});

assert.equal(normalizeAirportRow({ ident: "" }), null);

const allBlank = normalizeAirports([{ ident: "" }, { ident: "EGLL" }]);
assert.equal(allBlank.length, 1);
assert.equal(allBlank[0].ident, "EGLL");

const runway = normalizeRunwayRow({
  id: "269408",
  airport_ref: "6523",
  airport_ident: "00a",
  length_ft: "80",
  width_ft: "",
  surface: "ASPH-G",
  lighted: "1",
  closed: "0",
  le_ident: "h1",
  le_latitude_deg: "",
  le_longitude_deg: "",
  le_elevation_ft: "",
  le_heading_degT: "",
  le_displaced_threshold_ft: "",
  he_ident: "",
  he_latitude_deg: "",
  he_longitude_deg: "",
  he_elevation_ft: "",
  he_heading_degT: "",
  he_displaced_threshold_ft: "",
});

assert.equal(runway.id, 269408);
assert.equal(runway.airport_ident, "00A");
assert.equal(runway.length_ft, 80);
assert.equal(runway.width_ft, null);
assert.equal(runway.lighted, true);
assert.equal(runway.closed, false);
assert.equal(runway.le_ident, "H1");
assert.equal(runway.he_ident, "");

assert.equal(normalizeRunwayRow({ id: "1", airport_ident: "" }), null);
assert.equal(normalizeRunwayRow({ id: "", airport_ident: "KBOS" }), null);

const freq = normalizeFrequencyRow({
  id: "70518",
  airport_ref: "6528",
  airport_ident: "00ca",
  type: "CTAF",
  description: "CTAF",
  frequency_mhz: "122.9",
});
assert.equal(freq.airport_ident, "00CA");
assert.equal(freq.frequency_mhz, 122.9);

const navaid = normalizeNavaidRow({
  id: "85050",
  filename: "Williams_Harbour_NDB_CA",
  ident: "1a",
  name: "Williams Harbour",
  type: "NDB",
  frequency_khz: "373",
  latitude_deg: "52.55889892578125",
  longitude_deg: "-55.78219985961914",
  elevation_ft: "70",
  iso_country: "ca",
  dme_frequency_khz: "",
  dme_channel: "",
  dme_latitude_deg: "",
  dme_longitude_deg: "",
  dme_elevation_ft: "",
  slaved_variation_deg: "",
  magnetic_variation_deg: "-23.072",
  usageType: "LO",
  power: "MEDIUM",
  associated_airport: "cca6",
});
assert.equal(navaid.id, 85050);
assert.equal(navaid.ident, "1A");
assert.equal(navaid.iso_country, "CA");
assert.equal(navaid.associated_airport, "CCA6");
assert.equal(navaid.usage_type, "LO");
assert.equal(navaid.dme_frequency_khz, null);

console.log("ourAirportsNormalizer.test.ts: ok");
