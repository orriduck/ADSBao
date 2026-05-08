import assert from "node:assert/strict";

import { fetchJson } from "./httpClient.js";

const json = await fetchJson(
  async () => new Response(JSON.stringify({ ok: true })),
  "https://example.test/data.json",
);

assert.deepEqual(json, { ok: true });

await assert.rejects(
  fetchJson(
    async () => new Response("abcdef"),
    "https://example.test/large.json",
    { maxBytes: 5 },
  ),
  /large\.json exceeded 5 bytes/,
);
