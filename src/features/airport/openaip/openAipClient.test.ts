import assert from "node:assert/strict";

import {
  buildOpenAipCacheKey,
  createOpenAipClient,
  createOpenAipClientFromEnv,
} from "./openAipClient";

const jsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  async text() {
    return JSON.stringify(payload);
  },
});

{
  const calls = [];
  const client = createOpenAipClient({
    apiKey: "secret-key",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ items: [{ icaoCode: "KBOS", iataCode: "BOS" }] });
    },
  });

  const payload = await client.listAirports({
    search: "KBOS",
    country: "US",
    limit: 5,
    fields: ["_id", "icaoCode", "iataCode"],
  });

  assert.equal(payload.items[0].icaoCode, "KBOS");
  assert.match(calls[0].url, /^https:\/\/api\.core\.openaip\.net\/api\/airports\?/);
  assert.match(calls[0].url, /search=KBOS/);
  assert.match(calls[0].url, /country=US/);
  assert.match(calls[0].url, /limit=5/);
  assert.match(calls[0].url, /fields=_id%2CicaoCode%2CiataCode/);
  assert.equal(calls[0].init.headers["x-openaip-api-key"], "secret-key");
  assert.equal(calls[0].init.headers.accept, "application/json");
}

{
  const client = createOpenAipClientFromEnv({ env: {} });
  assert.equal(client, null);
}

{
  assert.equal(
    buildOpenAipCacheKey("airports", {
      search: " KBOS ",
      country: "us",
      limit: 5,
    }),
    "openaip:airports:country=us:limit=5:search=KBOS",
  );
}

{
  const client = createOpenAipClient({
    apiKey: "secret-key",
    fetchImpl: async () => jsonResponse({ message: "no" }, 401),
  });

  await assert.rejects(
    () => client.listAirports({ search: "KBOS" }),
    /OpenAIP airports request failed: HTTP 401/,
  );
}

console.log("openAipClient.test.ts: ok");
