import assert from "node:assert/strict";

import {
  buildSocialSessionHash,
  getSocialSessionSeed,
  normalizeSocialSummarySearchParams,
} from "./socialRouteModel.js";

{
  const request = new Request("https://adsbao.test/api/social/summary", {
    headers: {
      "x-adsbao-session": "browser-session-1",
      "user-agent": "ignored",
      "x-forwarded-for": "203.0.113.10",
    },
  });
  assert.equal(getSocialSessionSeed(request), "browser-session-1");
  const hash = buildSocialSessionHash("browser-session-1", {
    env: { SOCIAL_SESSION_SALT: "salt-a" },
  });
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, "browser-session-1");
  assert.notEqual(
    hash,
    buildSocialSessionHash("browser-session-1", {
      env: { SOCIAL_SESSION_SALT: "salt-b" },
    }),
  );
}

{
  const request = new Request("https://adsbao.test/api/social/summary", {
    headers: {
      "user-agent": "Mozilla/5.0",
      "x-forwarded-for": "203.0.113.10, 198.51.100.2",
    },
  });
  assert.equal(
    getSocialSessionSeed(request),
    "203.0.113.10|Mozilla/5.0",
  );
}

{
  const params = new URLSearchParams({
    entityType: "aircraft",
    entityKey: "dal 977",
    contextAirportIcao: "kbos",
  });
  assert.deepEqual(normalizeSocialSummarySearchParams(params), {
    ok: true,
    value: {
      entityType: "aircraft",
      entityKey: "DAL977",
      contextAirportIcao: "KBOS",
    },
  });
}
