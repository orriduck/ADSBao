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
  data: { anchor: { lat: 42.36, lon: -71.01 } },
});
assert.deepEqual(received, [], "anchor-only snapshot must not settle a stream");
assert.equal(states.includes("live"), false, "pending snapshot must not mark live");

source.emit("nearby:snapshot", {
  protocolVersion: "1",
  channel: request.channel,
  eventId: "snapshot-1",
  sequence: 2,
  emittedAt: "2026-08-08T00:00:00Z",
  stale: false,
  data: { aircraft: { ac: [] }, nearbyAirports: [] },
});
assert.deepEqual(received, ["a:nearby:snapshot:2", "b:nearby:snapshot:2"]);
assert.ok(states.includes("live"), "snapshot moves a source to live");

unsubscribeA();
assert.equal(source.closed, false, "one consumer keeps the shared source alive");
unsubscribeB();
assert.equal(source.closed, true, "last consumer releases the source after grace");

console.log("nearbySseClient.test.ts ok");
