import assert from "node:assert/strict";

import { createOurAirportsImporter } from "./ourAirportsImporter.js";

const airportsCsv =
  '"id","ident","type","name","latitude_deg","longitude_deg","elevation_ft","continent","iso_country","iso_region","municipality","scheduled_service","icao_code","iata_code","gps_code","local_code","home_link","wikipedia_link","keywords"\n' +
  '3670,"KBOS","large_airport","Boston Logan",42.36429977,-71.00520325,20,"NA","US","US-MA","Boston","yes","KBOS","BOS","KBOS","BOS","",,\n' +
  '2155,"EGLL","large_airport","London Heathrow",51.4706,-0.461941,83,"EU","GB","GB-ENG","London","yes","EGLL","LHR","EGLL","",,,\n';

const runwaysCsv =
  '"id","airport_ref","airport_ident","length_ft","width_ft","surface","lighted","closed","le_ident","le_latitude_deg","le_longitude_deg","le_elevation_ft","le_heading_degT","le_displaced_threshold_ft","he_ident","he_latitude_deg","he_longitude_deg","he_elevation_ft","he_heading_degT","he_displaced_threshold_ft"\n' +
  '5,3670,"KBOS",10083,150,"ASP",1,0,"04R",,,,,,,"22L",,,,,\n';

const frequenciesCsv =
  '"id","airport_ref","airport_ident","type","description","frequency_mhz"\n' +
  '100,3670,"KBOS","TWR","BOSTON TOWER",128.8\n';

const navaidsCsv =
  '"id","filename","ident","name","type","frequency_khz","latitude_deg","longitude_deg","elevation_ft","iso_country","dme_frequency_khz","dme_channel","dme_latitude_deg","dme_longitude_deg","dme_elevation_ft","slaved_variation_deg","magnetic_variation_deg","usageType","power","associated_airport"\n' +
  '12345,"BOS_VORTAC_US","BOS","Boston","VOR-DME",112700,42.358,-70.987,3,"US",,,,,,,-14.0,"HI","HIGH","KBOS"\n';

const csvByUrl = {
  "https://davidmegginson.github.io/ourairports-data/airports.csv": airportsCsv,
  "https://davidmegginson.github.io/ourairports-data/runways.csv": runwaysCsv,
  "https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv": frequenciesCsv,
  "https://davidmegginson.github.io/ourairports-data/navaids.csv": navaidsCsv,
};

const fakeFetch = async (url) => {
  const body = csvByUrl[url];
  if (body == null) {
    return { ok: false, status: 404, async text() { return ""; } };
  }
  return {
    ok: true,
    status: 200,
    async text() {
      return body;
    },
  };
};

const upsertCalls = [];

const fakeClient = {
  from(table) {
    return {
      async upsert(rows, options) {
        upsertCalls.push({ table, rowCount: rows.length, options, firstIdent: rows[0]?.ident || rows[0]?.airport_ident });
        return { error: null };
      },
    };
  },
};

const importer = createOurAirportsImporter({
  supabaseUrl: "https://example.test",
  supabaseKey: "service_role_key",
  createClientImpl: () => fakeClient,
  fetchImpl: fakeFetch,
});

const counts = await importer.import({ batchSize: 1000 });

assert.deepEqual(counts, {
  airports: 2,
  runways: 1,
  frequencies: 1,
  navaids: 1,
});

const tables = upsertCalls.map((call) => call.table);
assert.deepEqual(tables, [
  "airports",
  "runways",
  "airport_frequencies",
  "navaids",
]);

assert.equal(upsertCalls[0].options.onConflict, "ident");
assert.equal(upsertCalls[1].options.onConflict, "id");
assert.equal(upsertCalls[2].options.onConflict, "id");
assert.equal(upsertCalls[3].options.onConflict, "id");

// Batch sizing: 3 airports with batchSize=2 -> 2 calls.
upsertCalls.length = 0;
const batchedFetch = async (url) =>
  url.endsWith("airports.csv")
    ? {
        ok: true,
        status: 200,
        async text() {
          return (
            airportsCsv +
            '4000,"CYYZ","large_airport","Toronto Pearson",43.6772003174,-79.6305999756,569,"NA","CA","CA-ON","Toronto","yes","CYYZ","YYZ","CYYZ","",,,\n'
          );
        },
      }
    : fakeFetch(url);

const batchedImporter = createOurAirportsImporter({
  supabaseUrl: "https://example.test",
  supabaseKey: "service_role_key",
  createClientImpl: () => fakeClient,
  fetchImpl: batchedFetch,
});

await batchedImporter.import({ batchSize: 2 });
const airportCalls = upsertCalls.filter((call) => call.table === "airports");
assert.equal(airportCalls.length, 2);
assert.equal(airportCalls[0].rowCount, 2);
assert.equal(airportCalls[1].rowCount, 1);

console.log("ourAirportsImporter.test.js: ok");
