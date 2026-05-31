import assert from "node:assert/strict";
import test from "node:test";

import {
  aircraftMatchesFilters,
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
