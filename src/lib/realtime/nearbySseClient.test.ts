import assert from "node:assert/strict";

import { NearbySseClient } from "./nearbySseClient";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, Array<(event: { data?: unknown }) => void>>();
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: { data?: unknown }) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, payload: unknown) {
    for (const listener of this.listeners.get(type) || []) {
      listener({ data: JSON.stringify(payload) });
    }
  }
}

const client = new NearbySseClient({
  EventSourceCtor: FakeEventSource,
  releaseGraceMs: 0,
});
const request = {
  key: "nearby:42.36:-71.01",
  channel: "nearby:42.36:-71.01",
  url: "/events/nearby/coordinates/42.36/-71.01",
};
const received: string[] = [];
const states: string[] = [];
const unsubscribeA = client.subscribe({
  request,
  listener: (event) => received.push(`a:${event.type}:${event.sequence}`),
  onState: (state) => states.push(state),
});
const unsubscribeB = client.subscribe({
  request,
  listener: (event) => received.push(`b:${event.type}:${event.sequence}`),
});

assert.equal(FakeEventSource.instances.length, 1, "same nearby key shares one EventSource");
const source = FakeEventSource.instances[0];
source.onopen?.();
source.emit("nearby:snapshot", {
  protocolVersion: "1",
  channel: request.channel,
  eventId: "pending-1",
  sequence: 1,
  emittedAt: "2026-08-08T00:00:00Z",
  stale: false,
  data: {
    anchor: { lat: 42.36, lon: -71.01 },
    nearbyAirports: [{ icao: "KBOS" }],
  },
});
assert.deepEqual(
  received,
  ["a:nearby:snapshot:1", "b:nearby:snapshot:1"],
  "static nearby context must be delivered before traffic",
);
assert.equal(states.includes("live"), false, "static context must not mark live");

source.emit("nearby:snapshot", {
  protocolVersion: "1",
  channel: request.channel,
  eventId: "snapshot-1",
  sequence: 2,
  emittedAt: "2026-08-08T00:00:00Z",
  stale: false,
  data: { aircraft: { ac: [] }, nearbyAirports: [] },
});
assert.deepEqual(received, [
  "a:nearby:snapshot:1",
  "b:nearby:snapshot:1",
  "a:nearby:snapshot:2",
  "b:nearby:snapshot:2",
]);
assert.ok(states.includes("live"), "snapshot moves a source to live");

client.restart(request.key);
const restartedSource = FakeEventSource.instances[1];
assert.ok(restartedSource, "restart creates a replacement EventSource");
source.emit("nearby:traffic", {
  protocolVersion: "1",
  channel: request.channel,
  eventId: "late-old-source",
  sequence: 3,
  emittedAt: "2026-08-08T00:00:01Z",
  stale: true,
  data: { aircraft: { ac: [] } },
});
assert.equal(
  received.length,
  4,
  "a frame from the closed source must not overwrite the replacement stream",
);
restartedSource.emit("nearby:traffic", {
  protocolVersion: "1",
  channel: request.channel,
  eventId: "replacement-source",
  sequence: 4,
  emittedAt: "2026-08-08T00:00:02Z",
  stale: false,
  data: { aircraft: { ac: [] } },
});
assert.equal(received.length, 6, "the replacement source remains active");

unsubscribeA();
assert.equal(
  restartedSource.closed,
  false,
  "one consumer keeps the replacement source alive",
);
unsubscribeB();
assert.equal(
  restartedSource.closed,
  true,
  "last consumer releases the replacement source after grace",
);

console.log("nearbySseClient.test.ts ok");
