import assert from "node:assert/strict";
import {
  buildOpenFreeMapVectorTileUrl,
  createOpenFreeMapVectorSourceClient,
  resolveOpenFreeMapVectorTileTemplate,
} from "./threeOsmVectorTileSource";

const template =
  "https://tiles.openfreemap.org/planet/20260823_080002_pt/{z}/{x}/{y}.pbf";
assert.equal(
  resolveOpenFreeMapVectorTileTemplate({ tiles: [template] }),
  template,
);
assert.equal(
  buildOpenFreeMapVectorTileUrl(template, { z: 13, x: 2480, y: 3029 }),
  "https://tiles.openfreemap.org/planet/20260823_080002_pt/13/2480/3029.pbf",
);
assert.equal(
  resolveOpenFreeMapVectorTileTemplate({
    tiles: ["https://evil.example/{z}/{x}/{y}.pbf"],
  }),
  null,
);
assert.equal(
  resolveOpenFreeMapVectorTileTemplate({
    tiles: ["http://tiles.openfreemap.org/{z}/{x}/{y}.pbf"],
  }),
  null,
);
assert.equal(
  resolveOpenFreeMapVectorTileTemplate({
    tiles: ["https://tiles.openfreemap.org/static/vector.pbf"],
  }),
  null,
);

let requests = 0;
const client = createOpenFreeMapVectorSourceClient({
  fetchImpl: async () => {
    requests += 1;
    return new Response(JSON.stringify({ tiles: [template] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
assert.equal(await client.loadTemplate(), template);
assert.equal(await client.loadTemplate(), template);
assert.equal(requests, 1);

console.log("threeOsmVectorTileSource.test.ts ok");
