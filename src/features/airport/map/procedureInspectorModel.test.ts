import assert from "node:assert/strict";

import {
  buildProcedureChoiceLabel,
  buildProcedureChoices,
  buildProcedureInspectorViewModel,
  buildRunwayProcedureChoices,
  buildVisibleProcedurePayload,
  DEFAULT_PROCEDURE_PHASES,
  resolveProcedureInspectorState,
} from "./procedureInspectorModel";

const runwayProcedures = {
  airport: "KBOS",
  source: "FAA CIFP",
  cycle: "260416",
  runwayDirections: [
    {
      runway: "04R",
      runwayPair: "04R/22L",
      approaches: [
        {
          id: "ils-04r",
          procedureCode: "I04R",
          name: "ILS RWY 04R",
          final: [{ phase: "final" }, { phase: "runway" }],
          missed: [{ phase: "missed" }],
          transitions: [{ name: "BASE", legs: [{ phase: "transition" }] }],
        },
        {
          id: "rnav-04r",
          procedureCode: "R04R",
          name: "RNAV (GPS) RWY 04R",
          final: [{ phase: "final" }, { phase: "runway" }],
          missed: [{ phase: "missed" }],
          transitions: [],
        },
      ],
    },
    {
      runway: "22L",
      runwayPair: "04R/22L",
      approaches: [
        {
          id: "rnav-22lx",
          procedureCode: "R22LX",
          name: "RNAV (GPS) RWY 22L",
          final: [{ phase: "final" }, { phase: "runway" }],
          missed: [],
          transitions: [],
        },
        {
          id: "rnav-22ly",
          procedureCode: "R22LY",
          name: "RNAV (GPS) RWY 22L",
          final: [{ phase: "final" }, { phase: "runway" }],
          missed: [],
          transitions: [],
        },
      ],
    },
  ],
};

assert.deepEqual(DEFAULT_PROCEDURE_PHASES, ["final", "runway"]);
assert.deepEqual(
  buildRunwayProcedureChoices(runwayProcedures).map((choice) => choice.runway),
  ["04R", "22L"],
);
assert.deepEqual(
  buildProcedureChoices(runwayProcedures, "22L").map((choice) => choice.label),
  [
    "R22LX · RNAV (GPS) RWY 22L",
    "R22LY · RNAV (GPS) RWY 22L",
  ],
);

assert.deepEqual(
  buildVisibleProcedurePayload(runwayProcedures, {}).runwayDirections,
  [],
);

assert.deepEqual(
  resolveProcedureInspectorState(runwayProcedures, {
    selectedRunway: "04R",
    selectedProcedureCode: "missing",
  }),
  {
    selectedRunway: "04R",
    selectedProcedureCode: "I04R",
  },
);

const selectedRnav04R = buildVisibleProcedurePayload(runwayProcedures, {
  selectedRunway: "04R",
  selectedProcedureCode: "R04R",
});

assert.deepEqual(
  selectedRnav04R.runwayDirections.map((runway) => runway.runway),
  ["04R"],
);
assert.deepEqual(
  selectedRnav04R.runwayDirections[0].approaches.map(
    (approach) => approach.procedureCode,
  ),
  ["R04R"],
);
assert.equal(selectedRnav04R.runwayDirections[0].approaches[0].missed.length, 0);
assert.equal(
  selectedRnav04R.runwayDirections[0].approaches[0].transitions.length,
  0,
);

const selectedWithMissed = buildVisibleProcedurePayload(runwayProcedures, {
  selectedRunway: "04R",
  selectedProcedureCode: "R04R",
  visiblePhases: ["final", "runway", "missed"],
});

assert.equal(selectedWithMissed.runwayDirections[0].approaches[0].missed.length, 1);

const debugPayload = buildVisibleProcedurePayload(runwayProcedures, {
  allProceduresDebug: true,
});

assert.deepEqual(
  debugPayload.runwayDirections.map((runway) => [
    runway.runway,
    runway.approaches.map((approach) => approach.procedureCode),
  ]),
  [
    ["04R", ["I04R", "R04R"]],
    ["22L", ["R22LX", "R22LY"]],
  ],
);

assert.equal(
  buildProcedureChoiceLabel(runwayProcedures.runwayDirections[1].approaches[0]),
  "R22LX · RNAV (GPS) RWY 22L",
);

assert.deepEqual(
  buildProcedureInspectorViewModel(runwayProcedures, {
    selectedRunway: "22L",
    selectedProcedureCode: "missing",
  }),
  {
    selectedRunway: "22L",
    selectedProcedureCode: "R22LX",
    runwayChoices: [
      { runway: "04R", runwayPair: "04R/22L", approachCount: 2 },
      { runway: "22L", runwayPair: "04R/22L", approachCount: 2 },
    ],
    procedureChoices: [
      {
        id: "rnav-22lx",
        procedureCode: "R22LX",
        name: "RNAV (GPS) RWY 22L",
        label: "R22LX · RNAV (GPS) RWY 22L",
      },
      {
        id: "rnav-22ly",
        procedureCode: "R22LY",
        name: "RNAV (GPS) RWY 22L",
        label: "R22LY · RNAV (GPS) RWY 22L",
      },
    ],
  },
);
