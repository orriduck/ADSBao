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
  const registrations: Array<{ url: string; scope?: string }> = [];

  registerAdsbaoServiceWorker({
    prod: true,
    windowRef: {
      addEventListener(_event: string, handler: () => void) {
        loadHandler = handler;
      },
    },
    serviceWorker: {
      register: async (url: string, options?: { scope?: string }) => {
        registrations.push({ url, scope: options?.scope });
        return {};
      },
    },
  });

  assert.equal(typeof loadHandler, "function");
  loadHandler?.();
  await Promise.resolve();
  assert.deepEqual(registrations, [{ url: "/sw.js", scope: "/" }]);
}
