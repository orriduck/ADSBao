import assert from "node:assert/strict";
import test from "node:test";

import {
  aircraftMatchesFilters,
  aircraftTypeLabel,
  getAircraftTypeGroups,
  getNextEntityFilter,
} from "./aircraftFilters";

test("cycles entity filter from all to aircraft to airports and back", () => {
  assert.equal(getNextEntityFilter("all"), "aircraft");
  assert.equal(getNextEntityFilter("aircraft"), "airports");
  assert.equal(getNextEntityFilter("airports"), "all");
});

test("falls back to all after an unknown entity filter value", () => {
  assert.equal(getNextEntityFilter("stale"), "all");
});

test("filters aircraft by airport movement", () => {
  const departure = { movement: "DEPARTURE", flightRouteLabel: "BOS-LAX" };
  const arrival = { movement: "ARRIVAL", flightRouteLabel: "LAX-BOS" };
  const unknown = { movement: "UNKNOWN", flightRouteLabel: "ORD-DFW" };

  assert.equal(
    aircraftMatchesFilters(departure, { movementFilter: "departures" }),
    true,
  );
  assert.equal(
    aircraftMatchesFilters(arrival, { movementFilter: "departures" }),
    false,
  );
  assert.equal(
    aircraftMatchesFilters(arrival, { movementFilter: "arrivals" }),
    true,
  );
  assert.equal(
    aircraftMatchesFilters(unknown, { movementFilter: "arrivals" }),
    false,
  );
  assert.equal(
    aircraftMatchesFilters(unknown, { movementFilter: "all" }),
    true,
  );
});

test("groups aircraft type filters by raw ICAO value while displaying friendly names", () => {
  const groups = getAircraftTypeGroups([
    { type: " b38m ", category: " a3 " },
    {
      type: " e75l ",
      category: " a3 ",
      desc: "EMBRAER ERJ-170-200 (long wing)",
    },
  ]);

  assert.deepEqual(
    groups.find((group) => group.category === "A3")?.types,
    [
      {
        value: "B38M",
        label: "Boeing 737 MAX 8",
        shortLabel: "737 MAX 8",
        icaoType: "B38M",
      },
      {
        value: "E75L",
        label: "Embraer 175",
        shortLabel: "E175",
        icaoType: "E75L",
      },
    ],
  );
});

test("keeps aircraft type filter values as ICAO codes", () => {
  assert.equal(
    aircraftTypeLabel({
      type: " e75l ",
      category: " a3 ",
      desc: "EMBRAER ERJ-170-200 (long wing)",
    }),
    "E75L",
  );
});

test("labels category-only aircraft as unclassified in type filters", () => {
  const groups = getAircraftTypeGroups([{ category: " a3 " }]);

  assert.deepEqual(
    groups.find((group) => group.category === "A3")?.types,
    [
      {
        value: "A3",
        label: "All Unclassified",
        shortLabel: "All Unclassified",
        icaoType: "",
      },
    ],
  );
});
