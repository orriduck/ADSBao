import assert from "node:assert/strict";

import { parseCsv } from "./ourAirportsCsvParser";

const simple = parseCsv('a,b,c\n1,2,3\n4,5,6\n');
assert.deepEqual(simple.headers, ["a", "b", "c"]);
assert.deepEqual(simple.rows, [
  { a: "1", b: "2", c: "3" },
  { a: "4", b: "5", c: "6" },
]);

const quoted = parseCsv('a,b\n"hello, world","he said ""hi"""\n');
assert.deepEqual(quoted.rows, [{ a: "hello, world", b: 'he said "hi"' }]);

const trailingEmpty = parseCsv("a,b,c\n1,,3\n");
assert.deepEqual(trailingEmpty.rows, [{ a: "1", b: "", c: "3" }]);

const crlf = parseCsv("a,b\r\n1,2\r\n3,4\r\n");
assert.deepEqual(crlf.rows, [
  { a: "1", b: "2" },
  { a: "3", b: "4" },
]);

const lastRowNoNewline = parseCsv("a,b\n1,2");
assert.deepEqual(lastRowNoNewline.rows, [{ a: "1", b: "2" }]);

const bom = parseCsv('﻿"a","b"\n1,2\n');
assert.deepEqual(bom.headers, ["a", "b"]);
assert.deepEqual(bom.rows, [{ a: "1", b: "2" }]);

const blankLines = parseCsv("a,b\n1,2\n\n3,4\n");
assert.deepEqual(blankLines.rows, [
  { a: "1", b: "2" },
  { a: "3", b: "4" },
]);

const ourAirportsHeader =
  '"id","ident","type","name","latitude_deg","longitude_deg","elevation_ft","continent","iso_country","iso_region","municipality","scheduled_service","icao_code","iata_code","gps_code","local_code","home_link","wikipedia_link","keywords"\n' +
  '6523,"00A","heliport","Total RF Heliport",40.070985,-74.933689,11,"NA","US","US-PA","Bensalem","no",,,"K00A","00A","https://example.test/",,\n';

const ourAirports = parseCsv(ourAirportsHeader);
assert.equal(ourAirports.rows.length, 1);
assert.equal(ourAirports.rows[0].ident, "00A");
assert.equal(ourAirports.rows[0].municipality, "Bensalem");
assert.equal(ourAirports.rows[0].iata_code, "");
assert.equal(ourAirports.rows[0].latitude_deg, "40.070985");

console.log("ourAirportsCsvParser.test.ts: ok");
