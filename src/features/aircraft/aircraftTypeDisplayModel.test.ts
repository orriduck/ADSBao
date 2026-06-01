import assert from "node:assert/strict";

import { resolveAircraftDisplayModel } from "./aircraftTypeDisplayModel";

assert.deepEqual(
  resolveAircraftDisplayModel({
    type: " e75l ",
    category: " a3 ",
    desc: "EMBRAER ERJ-170-200 (long wing)",
  }),
  {
    displayName: "Embraer 175",
    shortName: "E175",
    icaoType: "E75L",
    category: "A3",
    source: "desc",
  },
);

assert.deepEqual(
  resolveAircraftDisplayModel({
    type: "b38m",
    category: "a3",
  }),
  {
    displayName: "Boeing 737 MAX 8",
    shortName: "737 MAX 8",
    icaoType: "B38M",
    category: "A3",
    source: "fallback",
  },
);

assert.deepEqual(
  resolveAircraftDisplayModel({
    type: "a21n",
    desc: "AIRBUS A-321neo",
  }),
  {
    displayName: "Airbus A321neo",
    shortName: "A321neo",
    icaoType: "A21N",
    category: "",
    source: "desc",
  },
);

assert.deepEqual(resolveAircraftDisplayModel({ type: "zzzz" }), {
  displayName: "ZZZZ",
  shortName: "ZZZZ",
  icaoType: "ZZZZ",
  category: "",
  source: "icao",
});

assert.deepEqual(resolveAircraftDisplayModel({ category: "a1" }), {
  displayName: "Unknown",
  shortName: "Unknown",
  icaoType: "",
  category: "A1",
  source: "category",
});
