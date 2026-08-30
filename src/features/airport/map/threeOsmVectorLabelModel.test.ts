import assert from "node:assert/strict";
import {
  isThreeOsmVectorLabelClassVisible,
  resolveThreeOsmVectorLabelText,
  selectThreeOsmVectorLabels,
  type ThreeOsmVectorLabelCandidate,
} from "./threeOsmVectorLabelModel";

assert.equal(
  resolveThreeOsmVectorLabelText({
    properties: {
      name: "Boston",
      "name:zh-Hans": "波士顿",
      name_en: "Boston",
    },
    kind: "place",
    locale: "zh-CN",
  }),
  "波士顿",
);
assert.equal(
  resolveThreeOsmVectorLabelText({
    properties: { name: "Logan International Airport", iata: "bos", icao: "KBOS" },
    kind: "aerodrome",
    locale: "en",
  }),
  "BOS",
);
assert.equal(
  resolveThreeOsmVectorLabelText({
    properties: { name: "Interstate Ninety", class: "motorway", ref: "i 90" },
    kind: "road",
    locale: "en",
  }),
  "I 90",
);
assert.equal(
  Array.from(
    resolveThreeOsmVectorLabelText({
      properties: { name: "A very long road name that should not monopolize the map" },
      kind: "road",
      locale: "en",
    }),
  ).length,
  32,
);

assert.equal(
  isThreeOsmVectorLabelClassVisible({
    kind: "road",
    className: "minor",
    sourceZoom: 13,
  }),
  false,
);
assert.equal(
  isThreeOsmVectorLabelClassVisible({
    kind: "road",
    className: "minor",
    sourceZoom: 14,
  }),
  true,
);
assert.equal(
  isThreeOsmVectorLabelClassVisible({
    kind: "place",
    className: "neighbourhood",
    sourceZoom: 12,
  }),
  false,
);

const candidates: ThreeOsmVectorLabelCandidate[] = [
  {
    id: "airport",
    text: "BOS",
    kind: "aerodrome",
    className: "international",
    x: 100,
    z: 80,
  },
  {
    id: "city",
    text: "Boston",
    kind: "place",
    className: "city",
    rank: 1,
    x: 20,
    z: 10,
  },
  {
    id: "road-far",
    text: "Route 1A",
    kind: "road",
    className: "secondary",
    x: 300,
    z: 300,
  },
  {
    id: "road-near",
    text: "Route 1A",
    kind: "road",
    className: "secondary",
    x: 30,
    z: 40,
  },
  {
    id: "minor-hidden",
    text: "Side Street",
    kind: "road",
    className: "minor",
    x: 10,
    z: 10,
  },
  {
    id: "water",
    text: "Boston Harbor",
    kind: "water",
    className: "bay",
    x: 40,
    z: 60,
  },
];
const selectedAt13 = selectThreeOsmVectorLabels(candidates, {
  sourceZoom: 13,
});
assert.deepEqual(
  selectedAt13.map((item) => item.id),
  ["airport", "city", "road-near", "water"],
);
assert.ok(selectedAt13[0].priority > selectedAt13[2].priority);
assert.equal(selectedAt13.some((item) => item.id === "road-far"), false);
assert.equal(selectedAt13.some((item) => item.id === "minor-hidden"), false);

const capped = selectThreeOsmVectorLabels(candidates, {
  sourceZoom: 14,
  maxLabels: 2,
});
assert.deepEqual(capped.map((item) => item.id), ["airport", "city"]);

console.log("threeOsmVectorLabelModel.test.ts ok");
