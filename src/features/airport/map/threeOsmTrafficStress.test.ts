import assert from "node:assert/strict";
import {
  THREE_OSM_AIRCRAFT_CAPACITY,
  buildThreeOsmTrafficRenderSources,
  parseThreeOsmTrafficStressTarget,
} from "./threeOsmTrafficStress";

const center = { lat: 42.3656, lon: -71.0096 };
const aircraft = Array.from({ length: 5 }, (_, index) => ({
  icao24: `icao-${index}`,
  callsign: `TEST${index}`,
  lat: center.lat + index * 0.001,
  lon: center.lon - index * 0.001,
  altitude: 2_000 + index * 100,
}));

assert.equal(parseThreeOsmTrafficStressTarget("250"), 250);
assert.equal(parseThreeOsmTrafficStressTarget("249"), null);
assert.equal(parseThreeOsmTrafficStressTarget("500"), null);
assert.equal(parseThreeOsmTrafficStressTarget(null), null);

const normal = buildThreeOsmTrafficRenderSources({ aircraft, center });
assert.equal(normal.length, aircraft.length);
assert.equal(normal.every((source) => !source.synthetic), true);
assert.equal(normal[0]?.aircraft, aircraft[0]);

const stress = buildThreeOsmTrafficRenderSources({
  aircraft,
  center,
  stressTarget: THREE_OSM_AIRCRAFT_CAPACITY,
});
assert.equal(stress.length, THREE_OSM_AIRCRAFT_CAPACITY);
assert.equal(stress.filter((source) => source.synthetic).length, 245);
assert.equal(new Set(stress.map((source) => source.renderKey)).size, 250);
assert.equal(
  stress.every((source) =>
    aircraft.some((item) => item.icao24 === source.selectionId),
  ),
  true,
);
assert.equal(
  stress.every(
    (source) =>
      Number.isFinite(source.aircraft.lat) && Number.isFinite(source.aircraft.lon),
  ),
  true,
);
assert.equal(
  stress
    .filter((source) => source.synthetic)
    .every((source) => {
      const latNm = (source.aircraft.lat - center.lat) * 60;
      const lonNm =
        (source.aircraft.lon - center.lon) *
        60 *
        Math.cos((center.lat * Math.PI) / 180);
      return Math.hypot(latNm, lonNm) <= 1.81;
    }),
  true,
);

const noSelectableAircraft = buildThreeOsmTrafficRenderSources({
  aircraft: [{ lat: center.lat, lon: center.lon }],
  center,
  stressTarget: THREE_OSM_AIRCRAFT_CAPACITY,
});
assert.equal(noSelectableAircraft.length, 1);
assert.equal(noSelectableAircraft[0]?.synthetic, false);

const capped = buildThreeOsmTrafficRenderSources({
  aircraft: Array.from({ length: 275 }, (_, index) => ({
    icao24: `capacity-${index}`,
    lat: center.lat,
    lon: center.lon,
  })),
  center,
});
assert.equal(capped.length, THREE_OSM_AIRCRAFT_CAPACITY);

console.log("threeOsmTrafficStress.test.ts ok");
