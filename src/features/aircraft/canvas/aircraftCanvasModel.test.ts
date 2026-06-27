import assert from "node:assert/strict";

import {
  resolveAircraftColorKey,
  buildAircraftDrawDescriptor,
  buildDrawList,
  pickAircraftAtPoint,
  type DescriptorContext,
} from "./aircraftCanvasModel";
import { DEPARTURE, ARRIVAL } from "../../../utils/aircraftMovement";

const baseCtx: DescriptorContext = {
  selected: false,
  focal: false,
  matchesFilters: true,
  selectionActive: false,
  traceActive: false,
  showCallsigns: true,
};

// ── resolveAircraftColorKey ──────────────────────────────────────────────
assert.equal(resolveAircraftColorKey({ onGround: true }, true), "ground");
assert.equal(resolveAircraftColorKey({}, false), "unknown");
assert.equal(
  resolveAircraftColorKey({ movement: DEPARTURE }, true),
  "departure",
);
assert.equal(resolveAircraftColorKey({ movement: ARRIVAL }, true), "arrival");
// onGround wins over movement.
assert.equal(
  resolveAircraftColorKey({ onGround: true, movement: DEPARTURE }, true),
  "ground",
);

// ── kind: dot / silhouette / focal ───────────────────────────────────────
// Slow traffic (< 30kt), not focal → dot.
assert.equal(
  buildAircraftDrawDescriptor(
    { icao24: "SLOW", velocity: 5 },
    baseCtx,
  ).kind,
  "dot",
);
// A known type at speed resolves a silhouette sprite.
const sil = buildAircraftDrawDescriptor(
  { icao24: "UAL1", type: "A320", velocity: 220, track: 90 },
  baseCtx,
);
assert.equal(sil.kind, "silhouette");
assert.ok(sil.iconSrc.length > 0);
assert.equal(sil.headingDeg, 90);
// Focal target never collapses to the dot, even at zero speed.
assert.notEqual(
  buildAircraftDrawDescriptor(
    { icao24: "FOCAL", velocity: 0 },
    { ...baseCtx, focal: true },
  ).kind,
  "dot",
);

// ── showLabel logic ──────────────────────────────────────────────────────
// selected always labels.
assert.equal(
  buildAircraftDrawDescriptor(
    { icao24: "A", velocity: 5 },
    { ...baseCtx, selected: true, showCallsigns: false },
  ).showLabel,
  true,
);
// focal always labels.
assert.equal(
  buildAircraftDrawDescriptor(
    { icao24: "A", velocity: 5 },
    { ...baseCtx, focal: true, showCallsigns: false },
  ).showLabel,
  true,
);
// callsigns off → no label (when not selected/focal).
assert.equal(
  buildAircraftDrawDescriptor(
    { icao24: "A", velocity: 200, type: "A320" },
    { ...baseCtx, showCallsigns: false },
  ).showLabel,
  false,
);
// trace mode suppresses ambient labels.
assert.equal(
  buildAircraftDrawDescriptor(
    { icao24: "A", velocity: 200, type: "A320" },
    { ...baseCtx, traceActive: true },
  ).showLabel,
  false,
);
// filtered-out (not selected) → dimmed + no label.
const dimmed = buildAircraftDrawDescriptor(
  { icao24: "A", velocity: 200, type: "A320" },
  { ...baseCtx, matchesFilters: false },
);
assert.equal(dimmed.showLabel, false);
assert.ok(dimmed.opacity < 1);
// matching → full opacity.
assert.equal(
  buildAircraftDrawDescriptor(
    { icao24: "A", velocity: 200, type: "A320" },
    baseCtx,
  ).opacity,
  1,
);

// ── label fallback ───────────────────────────────────────────────────────
assert.equal(
  buildAircraftDrawDescriptor({ icao24: "ABC123", velocity: 5 }, baseCtx).label,
  "ABC123",
);
assert.equal(
  buildAircraftDrawDescriptor(
    { icao24: "ABC123", callsign: "UAL5 ", velocity: 5 },
    baseCtx,
  ).label,
  "UAL5",
);

// ── buildDrawList ────────────────────────────────────────────────────────
const list = buildDrawList(
  [
    { icao24: "AAA", velocity: 200, type: "A320" },
    { icao24: "BBB", velocity: 5 },
    {}, // no identity → skipped
  ],
  {
    selectedId: "AAA",
    focalId: "BBB",
    selectionActive: false,
    traceActive: false,
    showCallsigns: true,
    matchesFilters: () => true,
  },
);
assert.equal(list.length, 2);
assert.equal(list[0].id, "AAA");
assert.equal(list[0].selected, true);
assert.equal(list[1].id, "BBB");
assert.equal(list[1].focal, true);
// BBB is slow but focal → not a dot.
assert.notEqual(list[1].kind, "dot");

// ── pickAircraftAtPoint ──────────────────────────────────────────────────
const pts = [
  { id: "near", x: 100, y: 100 },
  { id: "far", x: 300, y: 300 },
];
assert.equal(pickAircraftAtPoint(pts, 104, 103, 17), "near");
assert.equal(pickAircraftAtPoint(pts, 100, 100, 17), "near");
// Outside the radius → miss.
assert.equal(pickAircraftAtPoint(pts, 140, 140, 17), null);
// Empty list → null.
assert.equal(pickAircraftAtPoint([], 0, 0, 17), null);
// Overlap: later (visually-on-top) point wins a tie at equal distance.
assert.equal(
  pickAircraftAtPoint(
    [
      { id: "under", x: 50, y: 50 },
      { id: "over", x: 50, y: 50 },
    ],
    50,
    50,
    17,
  ),
  "over",
);

console.log("aircraftCanvasModel.test.ts passed");
