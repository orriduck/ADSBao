import assert from "node:assert/strict";

import {
  getDataSourceCountLabel,
  getExternalLinkOpenTarget,
} from "./aboutModel.js";

assert.equal(getDataSourceCountLabel([]), "0 feeds");
assert.equal(getDataSourceCountLabel([{ title: "METAR" }]), "1 feed");
assert.equal(
  getDataSourceCountLabel([{ title: "METAR" }, { title: "ADS-B" }]),
  "2 feeds",
);

assert.deepEqual(getExternalLinkOpenTarget("https://example.com"), {
  href: "https://example.com",
  target: "_blank",
  rel: "noreferrer",
});
