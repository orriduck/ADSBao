import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { buildAdsbaoServiceWorkerSource } from "./serviceWorkerSource";

const handlers: Record<string, (event: any) => void> = {};
const installed: Array<{ url: string; cache: string }> = [];
const cache = {
  addAll: async (requests) => { installed.push(...requests); },
  match: async (key) => key === "/index.html" ? "current shell" : key === "/icon.new.png" ? "new icon" : undefined,
};
runInNewContext(buildAdsbaoServiceWorkerSource({ cacheName: "adsbao-static-new", precacheUrls: ["/", "/icon.new.png"] }), {
  URL,
  Request: class { constructor(public url: string, public options) {} get cache() { return this.options.cache; } },
  self: { location: { origin: "https://adsbao.test" }, skipWaiting() {}, addEventListener: (name, handler) => { handlers[name] = handler; } },
  caches: {
    open: async (name) => { assert.equal(name, "adsbao-static-new"); return cache; },
    match: () => { assert.fail("must not read another release's cache"); },
  },
  fetch: async () => { throw new Error("offline"); },
});

let installation: Promise<unknown> | undefined;
handlers.install({ waitUntil: (p) => { installation = p; } });
await installation;
assert.deepEqual(installed.map((r) => [r.url, r.cache]), [["/", "reload"], ["/icon.new.png", "reload"]]);

async function respond(path: string, mode = "cors") {
  let response: Promise<unknown> | undefined;
  handlers.fetch({ request: { method: "GET", url: "https://adsbao.test" + path, mode }, respondWith: (p) => { response = p; } });
  return response;
}
assert.equal(await respond("/icon.new.png"), "new icon");
assert.equal(await respond("/", "navigate"), "current shell", "await a missing root before trying index.html");
assert.equal(await respond("/events/nearby/coordinates/42/-71"), undefined);
assert.equal(await respond("/api/search?q=Boston"), undefined);
console.log("serviceWorkerSource.test.ts ok");
