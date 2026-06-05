import assert from "node:assert/strict";

import { CHANGELOG } from "./changelog";
import {
  ADSBAO_SITE_VERSION,
  buildAdsbaoUserAgent,
} from "./siteMeta";

const expectedVersion = String(CHANGELOG[0]?.version || "").replace(/^v/i, "");
assert.ok(expectedVersion, "changelog must expose a leading entry version");
assert.equal(ADSBAO_SITE_VERSION, expectedVersion);
assert.equal(
  buildAdsbaoUserAgent("adsbdb/v0"),
  `ADSBao/${expectedVersion} (+https://github.com/orriduck/ADSBao) adsbdb/v0`,
);
assert.equal(
  buildAdsbaoUserAgent(),
  `ADSBao/${expectedVersion} (+https://github.com/orriduck/ADSBao)`,
);

console.log("siteMeta.test.ts ok");
