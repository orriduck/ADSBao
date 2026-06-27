import assert from "node:assert/strict";
import {
  buildSidebarStats,
  countAircraftMovements,
  type BuildSidebarStatsInput,
} from "./sidebarStatsModel";

const baseUnits = { distance: "nm", temperature: "c", altitude: "ft" } as const;

function makeInput(
  overrides: Partial<BuildSidebarStatsInput> = {},
): BuildSidebarStatsInput {
  return {
    nearMe: false,
    routeProvider: "flightaware",
    featureFlagsResolved: true,
    aircraft: [],
    selfSpeedMps: null,
    selfAltitudeMeters: null,
    groundSpeedUnit: "kmh",
    metar: null,
    metarLoading: false,
    units: { ...baseUnits },
    atcCount: 0,
    spottingCount: 0,
    ...overrides,
  };
}

const ids = (row: { id: string }[]) => row.map((item) => item.id);

// Movement counting only applies to the FlightAware provider.
{
  const aircraft = [
    { movement: "DEPARTURE" },
    { movement: "DEPARTURE" },
    { movement: "ARRIVAL" },
    { movement: "UNKNOWN" },
  ];
  assert.deepEqual(countAircraftMovements(aircraft, "flightaware"), {
    departureCount: 2,
    arrivalCount: 1,
  });
  assert.deepEqual(countAircraftMovements(aircraft, "adsbdb"), {
    departureCount: 0,
    arrivalCount: 0,
  });
}

// Airport + FlightAware → departures / arrivals movement row.
{
  const stats = buildSidebarStats(
    makeInput({
      aircraft: [{ movement: "DEPARTURE" }, { movement: "ARRIVAL" }],
    }),
  );
  assert.deepEqual(ids(stats.movementRow), ["departures", "arrivals"]);
  assert.equal(stats.movementRow[0].value, 1);
  assert.equal(stats.movementRow[1].value, 1);
}

// Non-FlightAware provider → no movement row at all.
{
  const stats = buildSidebarStats(makeInput({ routeProvider: "adsbdb" }));
  assert.deepEqual(stats.movementRow, []);
}

// FlightAware grant not resolved → no movement row.
{
  const stats = buildSidebarStats(makeInput({ featureFlagsResolved: false }));
  assert.deepEqual(stats.movementRow, []);
}

// Here mode → the movement row is the user's OWN speed/altitude, never
// departures/arrivals (the off-airport 0/0 bug this guards). Speed toggles its
// unit; altitude is a static readout.
{
  const stats = buildSidebarStats(
    makeInput({
      nearMe: true,
      aircraft: [{ movement: "DEPARTURE" }],
      selfSpeedMps: 10,
      selfAltitudeMeters: 304.8,
    }),
  );
  assert.deepEqual(ids(stats.movementRow), ["selfSpeed", "selfAltitude"]);
  assert.equal(stats.movementRow[0].interaction.kind, "groundSpeedToggle");
  assert.equal(stats.movementRow[1].interaction.kind, "readonly");
  // 10 m/s = 36 km/h by default; ~304.8 m ≈ 1000 ft.
  assert.equal(stats.movementRow[0].value, 36);
  assert.equal(stats.movementRow[0].unit, "km/h");
  assert.equal(stats.movementRow[1].value, 1000);
}

// Here mode speed follows the toggle unit, and a missing GPS fix collapses to
// null (rendered as an em dash).
{
  const mph = buildSidebarStats(
    makeInput({ nearMe: true, selfSpeedMps: 10, groundSpeedUnit: "mph" }),
  );
  assert.equal(mph.movementRow[0].value, 22);
  assert.equal(mph.movementRow[0].unit, "mph");

  const noFix = buildSidebarStats(
    makeInput({ nearMe: true, selfSpeedMps: null, selfAltitudeMeters: null }),
  );
  assert.equal(noFix.movementRow[0].value, null);
  assert.equal(noFix.movementRow[1].value, null);
}

// Context row: briefing always present; ATC only with frequencies; spotting
// always present and routed to the dedicated open handler.
{
  const noAtc = buildSidebarStats(makeInput());
  assert.deepEqual(ids(noAtc.contextRow), ["briefing", "spotting"]);

  const withAtc = buildSidebarStats(makeInput({ atcCount: 3 }));
  assert.deepEqual(ids(withAtc.contextRow), ["briefing", "atc", "spotting"]);
  const spotting = withAtc.contextRow.find((item) => item.id === "spotting");
  assert.equal(spotting?.interaction.kind, "spotting");
}

// Briefing temperature comes from the METAR raw temp; loading shows an em dash
// with no unit.
{
  const warm = buildSidebarStats(makeInput({ metar: { rawTemp: 21.4 } }));
  const briefing = warm.contextRow[0];
  assert.equal(briefing.value, 21);
  assert.equal(briefing.unit, "°C");

  const loading = buildSidebarStats(makeInput({ metarLoading: true }));
  assert.equal(loading.contextRow[0].value, "—");
  assert.equal(loading.contextRow[0].unit, undefined);
}

console.log("sidebarStatsModel.test.ts ok");
