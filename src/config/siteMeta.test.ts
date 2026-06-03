import assert from "node:assert/strict";

import {
  ADSBAO_SITE_VERSION,
  buildAdsbaoUserAgent,
} from "./siteMeta";

assert.equal(ADSBAO_SITE_VERSION, "1.11.1");
assert.equal(
  buildAdsbaoUserAgent("adsbdb/v0"),
  "ADSBao/1.11.1 (+https://github.com/orriduck/ADSBao) adsbdb/v0",
);
assert.equal(
  buildAdsbaoUserAgent(),
  "ADSBao/1.11.1 (+https://github.com/orriduck/ADSBao)",
);

console.log("siteMeta.test.ts ok");
