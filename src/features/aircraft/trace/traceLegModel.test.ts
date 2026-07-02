import assert from "node:assert/strict";

import { resolveTraceLegCutoffMs } from "./traceLegModel";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const BASE = 1_750_000_000_000;

type PointSpec = {
  atMs: number;
  lat?: number;
  lon?: number;
  altitude?: number | null;
  onGround?: boolean;
};

function point({
  atMs,
  lat = 40,
  lon = -73,
  altitude = 35_000,
  onGround = false,
}: PointSpec) {
  return { timestampMs: BASE + atMs, lat, lon, altitude, onGround };
}

// Cruise samples marching forward in space and time.
function cruise(fromMs: number, toMs: number, stepMs = MINUTE) {
  const out = [];
  for (let atMs = fromMs; atMs <= toMs; atMs += stepMs) {
    out.push(point({ atMs, lat: 40 + atMs / HOUR, altitude: 35_000 }));
  }
  return out;
}

// 1. Single continuous flight → no cutoff.
assert.equal(
  resolveTraceLegCutoffMs(cruise(0, 2 * HOUR)),
  null,
  "continuous cruise should not clip",
);

// 2. Oceanic coverage hole at cruise (70 min, both sides high) → keep.
assert.equal(
  resolveTraceLegCutoffMs([
    ...cruise(0, HOUR),
    ...cruise(HOUR + 70 * MINUTE, 3 * HOUR),
  ]),
  null,
  "a long cruise-altitude gap is oceanic, not a leg boundary",
);

// 3a. Transoceanic hole: a multi-hour gap between two CRUISE samples is
//     lost coverage over water, not a new leg — you cannot park at FL350.
assert.equal(
  resolveTraceLegCutoffMs([
    ...cruise(0, HOUR),
    ...cruise(5 * HOUR, 7 * HOUR),
  ]),
  null,
  "a cruise-to-cruise multi-hour hole (transoceanic) must not clip",
);

// 3b. The same multi-hour gap clips when either endpoint is not
//     confidently at cruise (low, on ground, or unknown altitude).
{
  const resume = 4 * HOUR + 30 * MINUTE;
  assert.equal(
    resolveTraceLegCutoffMs([
      ...cruise(0, HOUR),
      point({ atMs: HOUR + 2 * MINUTE, altitude: null }),
      ...cruise(resume, 6 * HOUR),
    ]),
    BASE + resume,
    "a multi-hour hole with an unknown-altitude endpoint starts a new leg",
  );
}

// 3c. Beyond the extreme ceiling even a cruise-to-cruise gap is two
//     flights (yesterday's return leg reappearing at altitude).
{
  const resume = 16 * HOUR;
  assert.equal(
    resolveTraceLegCutoffMs([
      ...cruise(0, HOUR),
      ...cruise(resume, 17 * HOUR),
    ]),
    BASE + resume,
    "a 15h cruise-to-cruise gap exceeds any real coverage hole",
  );
}

// 4. Ground gap: previous leg ends near the ground, 45 min silence, new
//    leg starts — clip at the reappearance.
{
  const leg2Start = 2 * HOUR;
  const points = [
    ...cruise(0, 70 * MINUTE),
    point({ atMs: 73 * MINUTE, altitude: 1_200 }),
    point({ atMs: 75 * MINUTE, altitude: 0, onGround: true }),
    point({ atMs: leg2Start, altitude: 0, onGround: true }),
    ...cruise(leg2Start + 5 * MINUTE, 3 * HOUR),
  ];
  assert.equal(
    resolveTraceLegCutoffMs(points),
    BASE + leg2Start,
    "a long near-ground gap should clip at the new leg's first sample",
  );
}

// 5. Continuous-coverage turnaround: stationary on the ground for 20 min
//    between two airborne legs → clip at the end of the dwell.
{
  const dwellStart = 80 * MINUTE;
  const dwellEnd = 100 * MINUTE;
  const points = [
    ...cruise(0, 70 * MINUTE),
    point({ atMs: 75 * MINUTE, lat: 41.2, altitude: 800 }),
  ];
  for (let atMs = dwellStart; atMs <= dwellEnd; atMs += 2 * MINUTE) {
    points.push(point({ atMs, lat: 41.25, lon: -73.5, altitude: 0, onGround: true }));
  }
  points.push(
    point({ atMs: dwellEnd + 4 * MINUTE, lat: 41.3, lon: -73.5, altitude: 2_000 }),
  );
  points.push(...cruise(dwellEnd + 10 * MINUTE, 3 * HOUR));
  assert.equal(
    resolveTraceLegCutoffMs(points),
    BASE + dwellEnd,
    "a parked dwell between airborne legs should clip at the dwell end",
  );
}

// 6. Currently-parked aircraft (trailing dwell) keeps its just-finished
//    flight visible — no boundary without airborne data after the dwell.
{
  const points = [...cruise(0, 70 * MINUTE)];
  for (let atMs = 80 * MINUTE; atMs <= 110 * MINUTE; atMs += 2 * MINUTE) {
    points.push(point({ atMs, lat: 41.25, lon: -73.5, altitude: 0, onGround: true }));
  }
  assert.equal(
    resolveTraceLegCutoffMs(points),
    null,
    "a trailing parked dwell must not clip the flight that just landed",
  );
}

// 7. Latest boundary wins across multiple legs in one day.
{
  const leg2 = 2 * HOUR;
  const leg3 = 5 * HOUR;
  const points = [
    ...cruise(0, HOUR),
    point({ atMs: 65 * MINUTE, altitude: 0, onGround: true }),
    point({ atMs: leg2, altitude: 0, onGround: true }),
    ...cruise(leg2 + 5 * MINUTE, 4 * HOUR),
    point({ atMs: 4 * HOUR + 10 * MINUTE, altitude: 0, onGround: true }),
    point({ atMs: leg3, altitude: 0, onGround: true }),
    ...cruise(leg3 + 5 * MINUTE, 7 * HOUR),
  ];
  assert.equal(
    resolveTraceLegCutoffMs(points),
    BASE + leg3,
    "with several legs the newest boundary should win",
  );
}

// 8. Unsorted multi-source input (persisted + full concatenated) works.
{
  const leg2Start = 2 * HOUR;
  const older = [
    point({ atMs: 60 * MINUTE, altitude: 500 }),
    point({ atMs: 62 * MINUTE, altitude: 0, onGround: true }),
  ];
  const newer = [
    point({ atMs: leg2Start, altitude: 0, onGround: true }),
    ...cruise(leg2Start + 5 * MINUTE, 3 * HOUR),
  ];
  assert.equal(
    resolveTraceLegCutoffMs([...newer, ...older, ...cruise(0, 55 * MINUTE)]),
    BASE + leg2Start,
    "unsorted concatenated sources should resolve the same boundary",
  );
}

// 9. Degenerate inputs.
assert.equal(resolveTraceLegCutoffMs([]), null);
assert.equal(resolveTraceLegCutoffMs([point({ atMs: 0 })]), null);
assert.equal(
  resolveTraceLegCutoffMs([{ lat: NaN, lon: 1, timestampMs: 5 }] as any),
  null,
);

console.log("traceLegModel.test.ts ok");
