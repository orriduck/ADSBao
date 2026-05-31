import assert from "node:assert/strict";

import {
  buildLiveProcedurePayload,
  discoverActiveProcedureRelease,
} from "./procedureSourceModel";

const downloadHtml = `
  <a href="https://aeronav.faa.gov/Upload_313-d/cifp/CIFP_260416.zip">CIFP 260416</a> (Zip) Apr 16, 2026  May 14, 2026
  <a href="/Upload_313-d/cifp/CIFP_260514.zip">CIFP 260514</a> (Zip) May 14, 2026  Jun 11, 2026
`;

assert.deepEqual(
  discoverActiveProcedureRelease({
    html: downloadHtml,
    now: new Date("2026-05-06T12:00:00Z"),
    pageUrl:
      "https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/",
  }),
  {
    cycle: "260416",
    url: "https://aeronav.faa.gov/Upload_313-d/cifp/CIFP_260416.zip",
    effectiveStart: "2026-04-16",
    effectiveEnd: "2026-05-14",
  },
);

assert.equal(
  discoverActiveProcedureRelease({
    html: downloadHtml,
    now: new Date("2026-05-20T12:00:00Z"),
    pageUrl:
      "https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/",
  }).cycle,
  "260514",
);

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
  "SUSAP KBOSK6FI04R  AGOSHI 010GOSHIK6PC0E  A    IF                                   06000     18000210              0 PS   391502208",
  "SUSAP KBOSK6FI04R  AGOSHI 020WINNIK6PC0EE B 010TF IBOSK6      21470169        PI  + 04000                           0 PS   391512208",
  "SUSAP KBOSK6FI04R  I      010WINNIK6PC0E  I    IF IBOSK6      21470169        PI  J 040000170018000                 0 DS   391522405",
  "SUSAP KBOSK6FI04R  I      011NABBOK6PC0E       CF IBOSK6      2147011903500050PI  + 03000                           0 DS   391532405",
  "SUSAP KBOSK6FI04R  I      020MILTTK6PC0E  F    CF IBOSK6      2147006903500050PI  H 0170001700            BOS   K6D 0 DS   391542405",
  "SUSAP KBOSK6FI04R  I      030RW04RK6PG0GY M    CF IBOSK6      2147001803500051PI    00069             -300          0 DS   391552405",
];

const payload = buildLiveProcedurePayload({
  lines: sampleLines,
  airport: "KBOS",
  cycle: "260514",
  maxProcedures: 2,
});

assert.equal(payload.index.airport, "KBOS");
assert.equal(payload.index.approaches.length, 2);
assert.equal(payload.runwayMap, undefined);
assert.equal(payload.geojson.type, "FeatureCollection");
assert.equal(payload.geojson.properties.procedureCount, 2);
assert.equal(
  new Set(payload.geojson.features.map((feature) => feature.properties.procedureId)).size,
  2,
);
