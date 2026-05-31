import assert from "node:assert/strict";

import { buildRunwayProcedurePayload } from "./runwayProcedureModel";

const sampleLines = [
  "SUSAP KBOSK6CGOSHI K60    W     N42021109W071094714                       W0139     NAR           GOSHI                    384662504",
  "SUSAP KBOSK6CWINNI K60    C     N42070171W071072822                       W0139     NAR           WINNI                    385712605",
  "SUSAP KBOSK6CNABBO K60    C     N42114268W071051320                       W0139     NAR           NABBO                    385072605",
  "SUSAP KBOSK6CWAXEN K60    C     N42350442W070544669                       W0141     NAR           WAXEN                    385682504",
  "SUSAP KBOSK6PR04R  RW04R001 0000W04A0N4221145450W07100372690-002230300N4222384380W07059566725106750056000512F400350365ED6E5393552004",
  "SUSAP KBOSK6FR04R  AGOSHI 010GOSHIK6PC0E  A    IF                                   06000     18000210              A-JS   392442004",
  "SUSAP KBOSK6FR04R  AGOSHI 020WINNIK6PC0EE B 010TF                                 + 04000                           A JS   392452004",
  "SUSAP KBOSK6FR04R  R      010WINNIK6PC0E  I    IF                                 + 04000     18000                 A JS   392462001",
  "SUSAP KBOSK6FR04R  R      020NABBOK6PC0E    010TF                                 + 03000                           A JS   392472004",
  "SUSAP KBOSK6FR04R  R      030RW04RK6PG0GY M 031TF                                   00069             -300          A JS   392512004",
  "SUSAP KBOSK6FR04R  R      040         0  M     CA                     0347        + 00218                           A JS   392521711",
  "SUSAP KBOSK6FR04R  R      050WAXENK6PC0EY   010TF                                 + 03000                           A JS   392542106",
  "SUSAP KBOSK6FR22LX R      010WINNIK6PC0E  I    IF                                 + 04000     18000                 A JS   492462001",
  "SUSAP KBOSK6FR22LX R      020RW22LK6PG0GY M 031TF                                   00069             -300          A JS   492512004",
  "SUSAP KBOSK6FR22LY R      010WINNIK6PC0E  I    IF                                 + 04000     18000                 A JS   592462001",
  "SUSAP KBOSK6FR22LY R      020RW22LK6PG0GY M 031TF                                   00069             -300          A JS   592512004",
];

const payload = buildRunwayProcedurePayload({
  lines: sampleLines,
  airport: "KBOS",
  cycle: "260514",
  maxProcedures: 2,
});

assert.equal(payload.airport, "KBOS");
assert.equal(payload.source, "FAA CIFP");
assert.equal(payload.cycle, "260514");
assert.equal(payload.totalParsedProcedures, 3);
assert.equal(payload.returnedProcedureCount, 2);
assert.equal(payload.isCapped, true);
assert.equal(payload.maxProcedures, 2);
assert.equal(payload.runwayDirections.length, 2);

const runway04R = payload.runwayDirections.find((item) => item.runway === "04R");
assert.equal(runway04R.runwayPair, "04R/22L");
assert.deepEqual(
  Object.keys(runway04R.threshold).toSorted(),
  ["lat", "lon"],
);
assert.equal(runway04R.approaches.length, 1);
assert.equal(runway04R.approaches[0].procedureCode, "R04R");
assert.equal(runway04R.approaches[0].type, "RNAV");
assert.equal(runway04R.approaches[0].transitions[0].name, "GOSHI");
assert.equal(runway04R.approaches[0].final.at(-1).fixIdent, "RW04R");
assert.deepEqual(
  runway04R.approaches[0].missed.map((leg) => leg.fixIdent),
  [undefined, "WAXEN"],
);
assert.equal(runway04R.approaches[0].unsupportedLegs[0].pathTerminator, "CA");
assert.equal(
  runway04R.approaches[0].warnings.some((warning) => warning.includes("CA")),
  true,
);

const runway22L = payload.runwayDirections.find((item) => item.runway === "22L");
assert.deepEqual(
  runway22L.approaches.map((procedure) => [
    procedure.name,
    procedure.procedureCode,
  ]),
  [
    ["RNAV (GPS) RWY 22L", "R22LX"],
  ],
);

const uncapped = buildRunwayProcedurePayload({
  lines: sampleLines,
  airport: "KBOS",
  cycle: "260514",
});

const uncapped22L = uncapped.runwayDirections.find(
  (item) => item.runway === "22L",
);
assert.equal(uncapped.isCapped, false);
assert.deepEqual(
  uncapped22L.approaches.map((procedure) => procedure.procedureCode),
  ["R22LX", "R22LY"],
);
assert.deepEqual(
  uncapped22L.approaches[0].final.at(-1).point,
  uncapped22L.threshold,
);
