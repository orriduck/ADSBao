import assert from "node:assert/strict";

import {
  ADSBAO_PRODUCT_NAME,
  ADSBAO_SITE_VERSION,
  buildAdsbaoUserAgent,
} from "./siteMeta";

assert.equal(ADSBAO_PRODUCT_NAME, "ADSBao");
assert.equal(ADSBAO_SITE_VERSION, "1.7.0");
assert.equal(
  buildAdsbaoUserAgent("adsbdb/v0"),
  "ADSBao/1.7.0 (+https://github.com/orriduck/ADSBao) adsbdb/v0",
);
assert.equal(
  buildAdsbaoUserAgent(),
  "ADSBao/1.7.0 (+https://github.com/orriduck/ADSBao)",
);

console.log("siteMeta.test.ts ok");
