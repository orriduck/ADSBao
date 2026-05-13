import assert from "node:assert/strict";

import {
  createOurAirportsQueries,
  mapAirportRow,
  mapNavaidRow,
  mapRunwayRow,
  typeRank,
} from "./ourAirportsQueries.js";

const KBOS = {
  ident: "KBOS",
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
  wikipedia_link: "",
  keywords: "",
};

assert.equal(typeRank("large_airport"), 0);
assert.equal(typeRank("heliport"), 5);
assert.equal(typeRank("unknown"), 9);

const mappedAirport = mapAirportRow(KBOS);
assert.equal(mappedAirport.icao, "KBOS");
assert.equal(mappedAirport.iata, "BOS");
assert.equal(mappedAirport.code, "KBOS");
assert.equal(mappedAirport.type_label, "Large Airport");
assert.equal(mappedAirport.city, "Boston");
assert.equal(mappedAirport.lat, 42.36429977);
assert.equal(mappedAirport.source, "ourairports");

const mappedRunway = mapRunwayRow({
  id: 5,
  airport_ident: "KBOS",
  length_ft: 10083,
  width_ft: 150,
  surface: "ASP",
  lighted: true,
  closed: false,
  le_ident: "04R",
  le_latitude_deg: 42.3,
  le_longitude_deg: -71.0,
  le_elevation_ft: 20,
  le_heading_deg_t: 41,
  le_displaced_threshold_ft: 0,
  he_ident: "22L",
  he_latitude_deg: 42.4,
  he_longitude_deg: -70.9,
  he_elevation_ft: 18,
  he_heading_deg_t: 221,
  he_displaced_threshold_ft: 0,
});
assert.equal(mappedRunway.lengthFt, 10083);
assert.equal(mappedRunway.le.ident, "04R");
assert.equal(mappedRunway.he.headingDegT, 221);

const mappedNavaid = mapNavaidRow({
  id: 12345,
  ident: "BOS",
  name: "Boston",
  type: "VOR-DME",
  frequency_khz: 112700,
  latitude_deg: 42.358,
  longitude_deg: -70.987,
  iso_country: "US",
  dme_channel: "74X",
  usage_type: "HI",
  power: "HIGH",
  associated_airport: "KBOS",
});
assert.equal(mappedNavaid.ident, "BOS");
assert.equal(mappedNavaid.dme.channel, "74X");
assert.equal(mappedNavaid.usageType, "HI");

const buildFakeClient = (tables) => {
  const filterRow = (table, filters, row) => {
    return filters.every((filter) => {
      switch (filter.kind) {
        case "eq":
          return row[filter.column] === filter.value;
        case "gte":
          return Number(row[filter.column]) >= filter.value;
        case "lte":
          return Number(row[filter.column]) <= filter.value;
        case "or":
          return filter.parts.some((part) => filterRow(table, [part], row));
        default:
          return true;
      }
    });
  };

  const parseOrPart = (part) => {
    const match = /^([^.]+)\.([^.]+)\.(.*)$/.exec(part);
    if (!match) return { kind: "unknown" };
    const [, column, op, raw] = match;
    if (op === "eq") return { kind: "eq", column, value: raw };
    if (op === "gte") return { kind: "gte", column, value: Number(raw) };
    if (op === "lte") return { kind: "lte", column, value: Number(raw) };
    if (op === "ilike") {
      const pattern = raw.replace(/\\(.)/g, "$1").toLowerCase();
      return {
        kind: "match",
        column,
        match: (row) => {
          const value = String(row[column] ?? "").toLowerCase();
          const regex = new RegExp(
            "^" + pattern.replace(/%/g, ".*").replace(/_/g, ".") + "$",
          );
          return regex.test(value);
        },
      };
    }
    return { kind: "unknown" };
  };

  const buildBuilder = (table) => {
    const filters = [];
    let limitValue = Infinity;
    const ordering = [];
    let limitToOne = false;
    let maybeSingleMode = false;

    const builder = {
      select() {
        return builder;
      },
      eq(column, value) {
        filters.push({ kind: "eq", column, value });
        return builder;
      },
      gte(column, value) {
        filters.push({ kind: "gte", column, value });
        return builder;
      },
      lte(column, value) {
        filters.push({ kind: "lte", column, value });
        return builder;
      },
      or(expression) {
        const parts = expression
          .split(",")
          .map((part) => parseOrPart(part.trim()))
          .filter((part) => part.kind !== "unknown");
        filters.push({ kind: "or", parts });
        return builder;
      },
      order(column, options) {
        ordering.push({ column, ascending: options?.ascending !== false });
        return builder;
      },
      limit(value) {
        limitValue = value;
        return builder;
      },
      maybeSingle() {
        maybeSingleMode = true;
        limitToOne = true;
        return builder.then ? builder : builder.exec();
      },
      then(resolve, reject) {
        return builder.exec().then(resolve, reject);
      },
      async exec() {
        const rows = tables[table] || [];
        const matched = rows.filter((row) => {
          for (const filter of filters) {
            if (filter.kind === "match" && !filter.match(row)) return false;
            if (filter.kind === "or") {
              const ok = filter.parts.some((part) =>
                part.kind === "match" ? part.match(row) : filterRow(table, [part], row),
              );
              if (!ok) return false;
              continue;
            }
            if (!filterRow(table, [filter], row)) return false;
          }
          return true;
        });

        if (ordering.length > 0) {
          matched.sort((left, right) => {
            for (const order of ordering) {
              const a = left[order.column];
              const b = right[order.column];
              if (a === b) continue;
              if (a == null) return order.ascending ? 1 : -1;
              if (b == null) return order.ascending ? -1 : 1;
              return order.ascending ? (a < b ? -1 : 1) : a < b ? 1 : -1;
            }
            return 0;
          });
        }

        const limited = matched.slice(0, Math.min(limitValue, matched.length));
        if (maybeSingleMode || limitToOne) {
          return { data: limited[0] || null, error: null };
        }
        return { data: limited, error: null };
      },
    };

    return builder;
  };

  return {
    from(table) {
      return buildBuilder(table);
    },
  };
};

const airports = [
  KBOS,
  {
    ...KBOS,
    ident: "KJFK",
    icao_code: "KJFK",
    iata_code: "JFK",
    name: "John F Kennedy International Airport",
    latitude_deg: 40.6413,
    longitude_deg: -73.7781,
    municipality: "New York",
    iso_region: "US-NY",
  },
  {
    ...KBOS,
    ident: "EGLL",
    icao_code: "EGLL",
    iata_code: "LHR",
    name: "London Heathrow Airport",
    latitude_deg: 51.4706,
    longitude_deg: -0.461941,
    municipality: "London",
    iso_country: "GB",
  },
];

const runways = [
  {
    id: 1,
    airport_ident: "KBOS",
    length_ft: 10083,
    width_ft: 150,
    surface: "ASP",
    lighted: true,
    closed: false,
    le_ident: "04R",
    he_ident: "22L",
  },
];

const frequencies = [
  {
    id: 1,
    airport_ident: "KBOS",
    type: "TWR",
    description: "BOSTON TOWER",
    frequency_mhz: 128.8,
  },
];

const navaids = [
  {
    id: 1,
    ident: "BOS",
    name: "Boston VOR",
    type: "VOR-DME",
    frequency_khz: 112700,
    latitude_deg: 42.358,
    longitude_deg: -70.987,
    iso_country: "US",
    associated_airport: "KBOS",
  },
];

const queries = createOurAirportsQueries({
  client: buildFakeClient({
    airports,
    runways,
    airport_frequencies: frequencies,
    navaids,
  }),
});

// Search by ICAO
const searchByIcao = await queries.searchAirports({ query: "KBOS" });
assert.equal(searchByIcao[0].icao, "KBOS");

// Search by IATA
const searchByIata = await queries.searchAirports({ query: "JFK" });
assert.equal(searchByIata[0].icao, "KJFK");

// Search by name fragment
const searchByName = await queries.searchAirports({ query: "Heathrow" });
assert.equal(searchByName[0].icao, "EGLL");

// Get by ident
const direct = await queries.getAirportByIdent("kbos");
assert.equal(direct.icao, "KBOS");

// Get nearby airports: KJFK is ~187 nm from KBOS, so radiusNm=200 should include it
const nearby = await queries.getNearbyAirports({
  ident: "KBOS",
  radiusNm: 250,
  limit: 5,
});
assert.equal(nearby.length, 1);
assert.equal(nearby[0].icao, "KJFK");
assert.ok(nearby[0].distanceNm > 150 && nearby[0].distanceNm < 220);

// Get runways
const runwaysOut = await queries.getRunwaysByAirport("KBOS");
assert.equal(runwaysOut.length, 1);
assert.equal(runwaysOut[0].le.ident, "04R");

// Get frequencies
const freqsOut = await queries.getFrequenciesByAirport("KBOS");
assert.equal(freqsOut.length, 1);
assert.equal(freqsOut[0].frequencyMhz, 128.8);

// Get nearby navaids
const nearbyNavaids = await queries.getNearbyNavaids({
  ident: "KBOS",
  radiusNm: 25,
  limit: 5,
});
assert.equal(nearbyNavaids.length, 1);
assert.equal(nearbyNavaids[0].ident, "BOS");

console.log("ourAirportsQueries.test.js: ok");
