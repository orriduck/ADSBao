import assert from "node:assert/strict";

import {
  classifyOpenAipAirspaceAccess,
  formatOpenAipAirspaceLimit,
  OPENAIP_AIRSPACE_TYPE,
} from "./airspaceAccessModel";

const ACTIVE_NOW = new Date("2026-05-31T16:00:00.000Z");

{
  const tag = classifyOpenAipAirspaceAccess({
    type: OPENAIP_AIRSPACE_TYPE.PROHIBITED,
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
    type: OPENAIP_AIRSPACE_TYPE.RESTRICTED,
    name: "R-2508",
    byNotam: true,
  }, { now: ACTIVE_NOW });

  assert.equal(tag.level, "restricted");
  assert.equal(tag.requiresStatusCheck, true);
  assert.match(tag.reason, /status/i);
}

{
  const tag = classifyOpenAipAirspaceAccess({
    type: OPENAIP_AIRSPACE_TYPE.DANGER,
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
    type: OPENAIP_AIRSPACE_TYPE.TRA,
    name: "TEMPORARY RESERVED AREA",
    activeUntil: "2026-05-31T12:00:00.000Z",
  }, { now: ACTIVE_NOW });

  assert.equal(tag.level, "informational");
  assert.equal(tag.requiresStatusCheck, false);
  assert.match(tag.reason, /not currently active/i);
}

{
  const tag = classifyOpenAipAirspaceAccess({
    type: OPENAIP_AIRSPACE_TYPE.ADIZ,
    name: "COASTAL ADIZ",
  }, { now: ACTIVE_NOW });

  assert.equal(tag.level, "permission-required");
  assert.equal(tag.requiresStatusCheck, false);
  assert.match(tag.reason, /identification/i);
}

{
  const tsaTag = classifyOpenAipAirspaceAccess({
    type: OPENAIP_AIRSPACE_TYPE.TSA,
    name: "MIL TSA",
    onRequest: true,
  }, { now: ACTIVE_NOW });
  assert.equal(tsaTag.level, "restricted");
  assert.equal(tsaTag.requiresStatusCheck, true);
}

{
  const ctrTag = classifyOpenAipAirspaceAccess({
    type: OPENAIP_AIRSPACE_TYPE.CTR,
    icaoClass: 3,
    name: "BANGKOK CTR",
  }, { now: ACTIVE_NOW });
  assert.equal(ctrTag.level, "controlled");
  assert.equal(ctrTag.requiresStatusCheck, false);

  const classBTag = classifyOpenAipAirspaceAccess({
    type: OPENAIP_AIRSPACE_TYPE.OTHER,
    icaoClass: 1,
    name: "BOSTON CLASS B",
  }, { now: ACTIVE_NOW });
  assert.equal(classBTag.level, "controlled");
  assert.equal(classBTag.shortLabel, "Controlled");
}

{
  const tag = classifyOpenAipAirspaceAccess({
    type: OPENAIP_AIRSPACE_TYPE.OTHER,
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
