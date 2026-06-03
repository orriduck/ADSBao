import assert from "node:assert/strict";

import {
  classifyOpenAipAirspaceAccess,
  formatOpenAipAirspaceLimit,
} from "./airspaceAccessModel";

const ACTIVE_NOW = new Date("2026-05-31T16:00:00.000Z");
const AIRSPACE_TYPE = {
  OTHER: 0,
  RESTRICTED: 1,
  DANGER: 2,
  PROHIBITED: 3,
  CTR: 4,
  TRA: 8,
  TSA: 9,
  ADIZ: 12,
};

{
  const tag = classifyOpenAipAirspaceAccess({
    type: AIRSPACE_TYPE.PROHIBITED,
    name: "P-56",
  }, { now: ACTIVE_NOW });

  assert.equal(tag.level, "blocked");
  assert.equal(tag.label, "Blocked");
  assert.equal(tag.shortLabel, "Blocked");
  assert.equal(tag.requiresStatusCheck, false);
  assert.match(tag.reason, /Prohibited/i);
}

{
  const tag = classifyOpenAipAirspaceAccess({
    type: AIRSPACE_TYPE.RESTRICTED,
    name: "R-2508",
    byNotam: true,
  }, { now: ACTIVE_NOW });

  assert.equal(tag.level, "restricted");
  assert.equal(tag.requiresStatusCheck, true);
  assert.match(tag.reason, /status/i);
}

{
  const tag = classifyOpenAipAirspaceAccess({
    type: AIRSPACE_TYPE.DANGER,
    name: "VTD20 HUA HIN DANGER AREA",
    activeFrom: "2026-05-31T12:00:00.000Z",
    activeUntil: "2026-05-31T18:00:00.000Z",
  }, { now: ACTIVE_NOW });

  assert.equal(tag.level, "caution");
  assert.equal(tag.requiresStatusCheck, false);
  assert.match(tag.reason, /active/i);
}

{
  const tag = classifyOpenAipAirspaceAccess({
    type: AIRSPACE_TYPE.TRA,
    name: "TEMPORARY RESERVED AREA",
    activeUntil: "2026-05-31T12:00:00.000Z",
  }, { now: ACTIVE_NOW });

  assert.equal(tag.level, "informational");
  assert.equal(tag.requiresStatusCheck, false);
  assert.match(tag.reason, /not currently active/i);
}

{
  const tag = classifyOpenAipAirspaceAccess({
    type: AIRSPACE_TYPE.ADIZ,
    name: "COASTAL ADIZ",
  }, { now: ACTIVE_NOW });

  assert.equal(tag.level, "permission-required");
  assert.equal(tag.requiresStatusCheck, false);
  assert.match(tag.reason, /identification/i);
}

{
  const tsaTag = classifyOpenAipAirspaceAccess({
    type: AIRSPACE_TYPE.TSA,
    name: "MIL TSA",
    onRequest: true,
  }, { now: ACTIVE_NOW });
  assert.equal(tsaTag.level, "restricted");
  assert.equal(tsaTag.requiresStatusCheck, true);
}

{
  const ctrTag = classifyOpenAipAirspaceAccess({
    type: AIRSPACE_TYPE.CTR,
    icaoClass: 3,
    name: "BANGKOK CTR",
  }, { now: ACTIVE_NOW });
  assert.equal(ctrTag.level, "controlled");
  assert.equal(ctrTag.requiresStatusCheck, false);

  const classBTag = classifyOpenAipAirspaceAccess({
    type: AIRSPACE_TYPE.OTHER,
    icaoClass: 1,
    name: "BOSTON CLASS B",
  }, { now: ACTIVE_NOW });
  assert.equal(classBTag.level, "controlled");
  assert.equal(classBTag.shortLabel, "Controlled");
}

{
  const tag = classifyOpenAipAirspaceAccess({
    type: AIRSPACE_TYPE.OTHER,
    icaoClass: 8,
    name: "UNCLASSIFIED SUA",
  }, { now: ACTIVE_NOW });
  assert.equal(tag.level, "unknown");
  assert.equal(tag.requiresStatusCheck, true);
}

{
  assert.equal(
    formatOpenAipAirspaceLimit({ value: 2500, unit: 1, referenceDatum: 1 }),
    "2500 ft MSL",
  );
  assert.equal(
    formatOpenAipAirspaceLimit({ value: 85, unit: 6, referenceDatum: 2 }),
    "FL 85",
  );
  assert.equal(
    formatOpenAipAirspaceLimit({ value: 0, unit: 1, referenceDatum: 0 }),
    "SFC",
  );
}

console.log("airspaceAccessModel.test.ts: ok");
