import assert from "node:assert/strict";

import { createRouteDisplayBatcher } from "./flightRouteDisplayBatchModel";

function createManualTimer() {
  const callbacks = [];
  return {
    callbacks,
    schedule(callback) {
      callbacks.push(callback);
      return callback;
    },
    clear(callback) {
      const index = callbacks.indexOf(callback);
      if (index >= 0) callbacks.splice(index, 1);
    },
    runNext() {
      const callback = callbacks.shift();
      if (callback) callback();
    },
  };
}

{
  const timer = createManualTimer();
  const published = [];
  const batcher = createRouteDisplayBatcher({
    publish: (routeVersion) => published.push(routeVersion),
    schedule: timer.schedule,
    clearSchedule: timer.clear,
    delayMs: 180,
  });

  batcher.syncRouteVersion(1);
  batcher.syncRouteVersion(2);
  batcher.syncRouteVersion(3);

  assert.deepEqual(published, []);
  assert.equal(timer.callbacks.length, 1);

  timer.runNext();

  assert.deepEqual(published, [3]);

  batcher.syncRouteVersion(3);
  assert.equal(timer.callbacks.length, 0);

  batcher.dispose();
}

{
  const timer = createManualTimer();
  const published = [];
  const batcher = createRouteDisplayBatcher({
    publish: (routeVersion) => published.push(routeVersion),
    schedule: timer.schedule,
    clearSchedule: timer.clear,
    delayMs: 180,
  });

  batcher.syncRouteVersion(1);
  batcher.dispose();

  assert.equal(timer.callbacks.length, 0);
  assert.deepEqual(published, []);
}

console.log("flightRouteDisplayBatchModel.test.ts ok");
