import assert from "node:assert/strict";
import { isAllowedWebSocketOrigin } from "./ws";

assert.equal(isAllowedWebSocketOrigin(undefined), true);
assert.equal(isAllowedWebSocketOrigin("http://localhost:3000"), true);
assert.equal(isAllowedWebSocketOrigin("https://adsbao.dev"), true);
assert.equal(
  isAllowedWebSocketOrigin("https://adsbao-4m1ndurbt-orriduck.vercel.app"),
  true,
);
assert.equal(
  isAllowedWebSocketOrigin(
    "https://adsbao-git-codex-realtime-data-service-orriduck.vercel.app",
  ),
  true,
);
assert.equal(isAllowedWebSocketOrigin("https://evil.example"), false);
assert.equal(
  isAllowedWebSocketOrigin("https://adsbao-attacker-other.vercel.app"),
  false,
);
assert.equal(
  isAllowedWebSocketOrigin("https://staging.example", [
    "https://staging.example",
  ]),
  true,
);

console.log("ws.test.ts ok");
