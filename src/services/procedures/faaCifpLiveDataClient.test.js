import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";

import { extractFaaCifpTextFromZip } from "./faaCifpLiveDataClient.js";

const zip = zipSync({
  FAACIFP18: strToU8("SUSAP KBOS SAMPLE"),
});

assert.equal(extractFaaCifpTextFromZip(zip.buffer), "SUSAP KBOS SAMPLE");

const officialStyleZip = zipSync({
  "CIFP Readme 2604.pdf": strToU8("readme"),
  "FAA CIFP Disclaimer.pdf": strToU8("disclaimer"),
  FAACIFP18: strToU8("SUSAP KBOS SAMPLE"),
  "Not_in_CIFP_2604.xlsx": strToU8("metadata"),
});

assert.equal(
  extractFaaCifpTextFromZip(officialStyleZip.buffer),
  "SUSAP KBOS SAMPLE",
);

const oversized = zipSync({
  FAACIFP18: strToU8("abcdef"),
});

assert.throws(
  () => extractFaaCifpTextFromZip(oversized.buffer, { maxCifpBytes: 5 }),
  /exceeded the configured size limit/,
);

const unexpectedFile = zipSync({
  "../FAACIFP18": strToU8("bad"),
});

assert.throws(
  () => extractFaaCifpTextFromZip(unexpectedFile.buffer),
  /unexpected file/,
);
