import assert from "node:assert/strict";

import {
  enrichAircraftWithRoutes,
  mergeTrackedAircraftIntoNearby,
  resolveAirportProfile,
  resolveAirportExplorerSelection,
} from "./airportExplorerModel";
import { ARRIVAL, DEPARTURE, UNKNOWN } from "../../../utils/aircraftMovement";

const fallbackProfile = resolveAirportProfile({ icao: "kbos" });
assert.equal(fallbackProfile.icao, "KBOS");
assert.equal(fallbackProfile.iata, "BOS");
assert.equal(fallbackProfile.name, "Boston Logan");
assert.equal(fallbackProfile.lat, 42.3656);
assert.equal(fallbackProfile.lon, -71.0096);

const providedProfile = resolveAirportProfile({
  icao: "kbos",
  airport: {
    icao: "KSEA",
    iata: "SEA",
    name: "Seattle-Tacoma International Airport",
    city: "Seattle",
    country: "United States",
    lat: 47.4502,
    lon: -122.3088,
  },
});
assert.equal(providedProfile.icao, "KSEA");
assert.equal(providedProfile.iata, "SEA");
assert.equal(providedProfile.city, "Seattle");

const localizedProfile = resolveAirportProfile({
  icao: "zspd",
  airport: {
    icao: "ZSPD",
    iata: "PVG",
    name: "Shanghai Pudong International Airport",
    localizedName: "上海浦东国际机场",
  },
});
assert.equal(localizedProfile.localizedName, "上海浦东国际机场");

const enriched = enrichAircraftWithRoutes({
  airportProfile: fallbackProfile,
  aircraft: [
    { icao24: "a1", callsign: " DAL 123 " },
    { icao24: "a2", callsign: "JBU456" },
    { icao24: "a3", callsign: "N12345" },
  ],
  routesByCallsign: {
    DAL123: {
      origin: { icao: "KBOS", iata: "BOS" },
      destination: { icao: "KATL", iata: "ATL" },
    },
    JBU456: {
      origin: { icao: "KLAX", iata: "LAX" },
      destination: { icao: "KBOS", iata: "BOS" },
    },
    N12345: {
      origin: { icao: "KJFK", iata: "JFK" },
      destination: { icao: "KORD", iata: "ORD" },
    },
  },
});

assert.equal(enriched[0].movement, DEPARTURE);
assert.equal(enriched[0].flightRouteLabel, "BOS -> ATL");
assert.equal(enriched[0].airportContext.airportIcao, "KBOS");
assert.equal(enriched[0].airportContext.movement, "departure");
assert.equal(enriched[1].movement, ARRIVAL);
assert.equal(enriched[1].flightRouteLabel, "LAX -> BOS");
assert.equal(enriched[1].airportContext.movement, "arrival");
assert.equal(enriched[2].movement, UNKNOWN);
assert.equal(enriched[2].flightRouteLabel, "JFK -> ORD");
assert.equal(enriched[2].airportContext.movement, "unknown");

const selection = resolveAirportExplorerSelection({
  aircraft: [
    { icao24: "a1", callsign: "DAL123" },
    { icao24: "", callsign: "JBU456" },
  ],
  selectedAircraftId: "JBU456",
  airports: [{ icao: "KBOS" }, { icao: "KJFK" }],
  selectedAirportIcao: "KJFK",
});

assert.equal(selection.selectedAircraft.callsign, "JBU456");
assert.equal(selection.selectedAircraftStillVisible, true);
assert.equal(selection.selectedAirport.icao, "KJFK");

const missingSelection = resolveAirportExplorerSelection({
  aircraft: [{ icao24: "a1", callsign: "DAL123" }],
  selectedAircraftId: "gone",
  airports: [{ icao: "KBOS" }],
  selectedAirportIcao: "KJFK",
});

assert.equal(missingSelection.selectedAircraft, null);
assert.equal(missingSelection.selectedAircraftStillVisible, false);
assert.equal(missingSelection.selectedAirport, null);

const mergedTracked = mergeTrackedAircraftIntoNearby({
  trackedAircraft: {
    icao24: "406e10",
    callsign: "VIR26Q",
    origin: "JFK",
    destination: "LHR",
    route: "JFK LHR",
    flightRoute: {
      origin: { iata: "JFK" },
      destination: { iata: "LHR" },
    },
    flightRouteLabel: "JFK -> LHR",
    lat: 46.1,
    lon: -64.1,
    altitude: 41000,
    positionTime: 1,
  },
  nearbyAircraft: [
    {
      icao24: "406e10",
      callsign: "G-VDIA",
      lat: 46.5,
      lon: -63.5,
      altitude: 40975,
      positionTime: 2,
    },
  ],
});

assert.equal(mergedTracked.length, 1);
assert.equal(mergedTracked[0].callsign, "VIR26Q");
assert.equal(mergedTracked[0].origin, "JFK");
assert.equal(mergedTracked[0].destination, "LHR");
assert.equal(mergedTracked[0].flightRouteLabel, "JFK -> LHR");
assert.equal(mergedTracked[0].lat, 46.5);
assert.equal(mergedTracked[0].altitude, 40975);
