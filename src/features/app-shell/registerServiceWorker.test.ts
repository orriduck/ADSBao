import assert from "node:assert/strict";
import { registerAdsbaoServiceWorker } from "./registerServiceWorker";

{
  let listened = false;
  registerAdsbaoServiceWorker({
    prod: false,
    windowRef: {
      addEventListener() {
        listened = true;
      },
    },
    serviceWorker: {
      register: async () => ({}),
    },
  });
  assert.equal(listened, false);
}

{
  let loadHandler: (() => void) | null = null;
  const registrations: Array<{ url: string; scope?: string; updateViaCache?: string }> = [];

  registerAdsbaoServiceWorker({
    prod: true,
    windowRef: {
      addEventListener(_event: string, handler: () => void) {
        loadHandler = handler;
      },
    },
    serviceWorker: {
      register: async (url, options) => {
        registrations.push({ url, ...options });
        return {};
      },
    },
  });

  assert.equal(typeof loadHandler, "function");
  loadHandler?.();
  await Promise.resolve();
  assert.deepEqual(registrations, [{ url: "/sw.js", scope: "/", updateViaCache: "none" }]);
}

{
  let registrations = 0;
  registerAdsbaoServiceWorker({
    prod: true,
    documentRef: { readyState: "complete" },
    windowRef: { addEventListener() { assert.fail("load already fired"); } },
    serviceWorker: { register: async () => { registrations++; } },
  });
  assert.equal(registrations, 1, "late-loaded entry still registers the current worker");
}
