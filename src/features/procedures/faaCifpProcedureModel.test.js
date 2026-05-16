import assert from "node:assert/strict";

import {
  buildProcedureIndex,
  parseFaaCifpProcedures,
  renderProcedureGeoJson,
} from "./faaCifpProcedureModel.js";

const sampleLines = [
  "SUSAP KBOSK6CGOSHI K60    W     N42021109W071094714                       W0139     NAR           GOSHI                    384662504",
  "SUSAP KBOSK6CWINNI K60    C     N42070171W071072822                       W0139     NAR           WINNI                    385712605",
  "SUSAP KBOSK6CNABBO K60    C     N42114268W071051320                       W0139     NAR           NABBO                    385072605",
  "SUSAP KBOSK6CMILTT K60    C     N42162512W071025708                       W0139     NAR           MILTT                    385022605",
  "SUSAP KBOSK6CIRSEW K60    C     N42192156W071013191                       W0140     NAR           IRSEW                    384792504",
  "SUSAP KBOSK6CWAXEN K60    C     N42350442W070544669                       W0141     NAR           WAXEN                    385682504",
  "SUSAP KBOSK6PR04R  RW04R001 0000W04A0N4221145450W07100372690-002230300N4222384380W07059566725106750056000512F400350365ED6E5393552004",
  "SUSAP KBOSK6FR04R  AGOSHI 010GOSHIK6PC0E  A    IF                                   06000     18000210              A-JS   392442004",
  "SUSAP KBOSK6FR04R  AGOSHI 020WINNIK6PC0EE B 010TF                                 + 04000                           A JS   392452004",
  "SUSAP KBOSK6FR04R  R      010WINNIK6PC0E  I    IF                                 + 04000     18000                 A JS   392462001",
  "SUSAP KBOSK6FR04R  R      011NABBOK6PC0E    010TF                                 + 03000                           A JS   392472004",
  "SUSAP KBOSK6FR04R  R      020MILTTK6PC1E  F 010TF                                 + 01700                 RW04R K6PGA JS   392482004",
  "SUSAP KBOSK6FR04R  R      021IRSEWK6PC0E S  031TF                                 V 0070000706        -300          A JS   392502004",
  "SUSAP KBOSK6FR04R  R      030RW04RK6PG0GY M 031TF                                   00069             -300          A JS   392512004",
  "SUSAP KBOSK6FR04R  R      040         0  M     CA                     0347        + 00218                           A JS   392521711",
  "SUSAP KBOSK6FR04R  R      050OMVOZK6PC0E    010DF                                                                   A JS   392531705",
  "SUSAP KBOSK6FR04R  R      060WAXENK6PC0EY   010TF                                 + 03000                           A JS   392542106",
  "SUSAP KBOSK6FR04R  R      070WAXENK6PC0EE  L   HM                     20900040    + 03000                           A JS   392552106",
];

const { procedures, warnings } = parseFaaCifpProcedures({
  lines: sampleLines,
  airport: "KBOS",
  cycle: "260514",
  procedureCodes: ["R04R"],
});

assert.equal(procedures.length, 1);
assert.equal(procedures[0].id, "kbos-r04r-rnav-gps-rwy-04r");
assert.equal(procedures[0].name, "RNAV (GPS) RWY 04R");
assert.equal(procedures[0].runway, "04R");
assert.equal(procedures[0].sourceCycle, "260514");
assert.equal(procedures[0].transitions.length, 2);
assert.equal(procedures[0].transitions[0].name, "GOSHI");
assert.equal(procedures[0].transitions[0].legs[0].pathTerminator, "IF");
assert.equal(procedures[0].transitions[0].legs[0].fixIdent, "GOSHI");
assert.equal(procedures[0].transitions[0].legs[0].altitudeMinFt, 6000);
assert.equal(procedures[0].transitions[0].legs[0].speedMaxKt, 210);
assert.equal(procedures[0].transitions[1].name, "FINAL");
assert.equal(procedures[0].transitions[1].legs[4].fixIdent, "RW04R");
assert.equal(procedures[0].transitions[1].legs[5].unsupported, true);
assert.equal(procedures[0].transitions[1].legs[5].pathTerminator, "CA");
assert.equal(warnings.some((warning) => warning.includes("CA")), true);
assert.equal(warnings.some((warning) => warning.includes("HM")), true);

const geojson = renderProcedureGeoJson(procedures[0]);
const lineStrings = geojson.features.filter(
  (feature) => feature.geometry.type === "LineString",
);
const points = geojson.features.filter(
  (feature) => feature.geometry.type === "Point",
);

assert.equal(geojson.type, "FeatureCollection");
assert.equal(lineStrings.length >= 6, true);
assert.equal(points.some((feature) => feature.properties.fixIdent === "MILTT"), true);
assert.deepEqual(lineStrings[0].properties, {
  procedureId: "kbos-r04r-rnav-gps-rwy-04r",
  procedureName: "RNAV (GPS) RWY 04R",
  runway: "04R",
  transitionName: "GOSHI",
  phase: "approach",
  legType: "TF",
  sequence: 20,
  fixIdent: "WINNI",
  altitudeMinFt: 4000,
});

assert.equal(
  lineStrings.some(
    (feature) =>
      feature.properties.phase === "runway" &&
      feature.properties.fixIdent === "RW04R",
  ),
  true,
);
assert.equal(
  geojson.features.some(
    (feature) =>
      feature.properties.phase === "missed" &&
      feature.properties.fixIdent === "WAXEN",
  ),
  true,
);

const index = buildProcedureIndex({
  airport: "KBOS",
  cycle: "260514",
  procedures,
});

assert.deepEqual(index.approaches, [
  {
    id: "kbos-r04r-rnav-gps-rwy-04r",
    name: "RNAV (GPS) RWY 04R",
    runway: "04R",
    supportedLegCount: 9,
    unsupportedLegCount: 2,
    warningCount: 2,
  },
]);
