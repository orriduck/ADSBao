import assert from "node:assert/strict";
import {
  AdsbaoRealtimeClient,
  resolveSameOriginRealtimeUrl,
} from "./adsbaoRealtimeClient";

type Listener = (event?: any) => void;

class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeSocket[] = [];

  readyState = FakeSocket.CONNECTING;
  sent: string[] = [];
  private readonly listeners = new Map<string, Listener[]>();

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    if (this.readyState === FakeSocket.CLOSED) return;
    this.readyState = FakeSocket.CLOSED;
    this.emit("close");
  }

  open() {
    this.readyState = FakeSocket.OPEN;
    this.emit("open");
  }

  message(payload: unknown) {
    this.emit("message", { data: JSON.stringify(payload) });
  }

  private emit(type: string, event?: any) {
    for (const listener of this.listeners.get(type) || []) listener(event);
  }
}

function createTimerHost() {
  let timeoutId = 0;
  let intervalId = 0;
  const timeouts = new Map<number, () => void>();
  const intervals = new Map<number, () => void>();
  return {
    host: {
      setTimeout(callback: () => void) {
        timeoutId += 1;
        timeouts.set(timeoutId, callback);
        return timeoutId;
      },
      clearTimeout(id: number) {
        timeouts.delete(id);
      },
      setInterval(callback: () => void) {
        intervalId += 1;
        intervals.set(intervalId, callback);
        return intervalId;
      },
      clearInterval(id: number) {
        intervals.delete(id);
      },
    },
    runNextTimeout() {
      const [id, callback] = timeouts.entries().next().value || [];
      if (!id) return false;
      timeouts.delete(id);
      callback();
      return true;
    },
    runNextInterval() {
      const [, callback] = intervals.entries().next().value || [];
      if (!callback) return false;
      callback();
      return true;
    },
    get timeoutCount() {
      return timeouts.size;
    },
  };
}

assert.equal(
  resolveSameOriginRealtimeUrl({ protocol: "https:", host: "www.adsbao.dev" }),
  "wss://www.adsbao.dev/ws",
);
assert.equal(
  resolveSameOriginRealtimeUrl({ protocol: "http:", host: "localhost:8080" }),
  "ws://localhost:8080/ws",
);
assert.equal(
  resolveSameOriginRealtimeUrl({ protocol: "file:", host: "" }),
  "",
);

{
  FakeSocket.instances = [];
  const timers = createTimerHost();
  const client = new AdsbaoRealtimeClient("ws://example.test/ws", {
    WebSocketCtor: FakeSocket as any,
    timerHost: timers.host as any,
    heartbeatIntervalMs: 0,
  });

  client.subscribe({
    channel: "traffic:center:42.4:-71:40",
    listener: () => {},
  });
  const firstSocket = FakeSocket.instances[0];
  firstSocket.open();
  assert.deepEqual(JSON.parse(firstSocket.sent[0]), {
    type: "subscribe",
    channel: "traffic:center:42.4:-71:40",
  });

  firstSocket.close();
  assert.equal(timers.timeoutCount, 1);
  assert.equal(timers.runNextTimeout(), true);

  const secondSocket = FakeSocket.instances[1];
  secondSocket.open();
  assert.deepEqual(JSON.parse(secondSocket.sent[0]), {
    type: "subscribe",
    channel: "traffic:center:42.4:-71:40",
  });
}

{
  FakeSocket.instances = [];
  const timers = createTimerHost();
  const client = new AdsbaoRealtimeClient("ws://example.test/ws", {
    WebSocketCtor: FakeSocket as any,
    timerHost: timers.host as any,
    heartbeatIntervalMs: 1,
    heartbeatTimeoutMs: 1,
  });

  client.subscribe({
    channel: "traffic:center:42.4:-71:40",
    listener: () => {},
  });
  const socket = FakeSocket.instances[0];
  socket.open();

  assert.equal(timers.runNextInterval(), true);
  assert.deepEqual(JSON.parse(socket.sent.at(-1) || "{}"), { type: "ping" });
  assert.equal(timers.runNextTimeout(), true);
  assert.equal(socket.readyState, FakeSocket.CLOSED);
  assert.equal(timers.timeoutCount, 1);
}

{
  FakeSocket.instances = [];
  const timers = createTimerHost();
  const client = new AdsbaoRealtimeClient("ws://example.test/ws", {
    WebSocketCtor: FakeSocket as any,
    timerHost: timers.host as any,
    heartbeatIntervalMs: 1,
    heartbeatTimeoutMs: 1,
  });

  client.subscribe({
    channel: "traffic:center:42.4:-71:40",
    listener: () => {},
  });
  const socket = FakeSocket.instances[0];
  socket.open();

  assert.equal(timers.runNextInterval(), true);
  socket.message({ type: "pong", now: new Date().toISOString() });
  assert.equal(timers.timeoutCount, 0);
}

{
  FakeSocket.instances = [];
  const timers = createTimerHost();
  const client = new AdsbaoRealtimeClient("ws://example.test/ws", {
    WebSocketCtor: FakeSocket as any,
    timerHost: timers.host as any,
    heartbeatIntervalMs: 0,
  });

  const unsubscribe = client.subscribe({
    channel: "traffic:center:42.4:-71:40",
    listener: () => {},
  });
  const socket = FakeSocket.instances[0];
  socket.open();
  unsubscribe();

  assert.equal(socket.readyState, FakeSocket.CLOSED);
  assert.equal(timers.timeoutCount, 0);
}

{
  FakeSocket.instances = [];
  const timers = createTimerHost();
  const states: string[] = [];
  const client = new AdsbaoRealtimeClient("ws://example.test/ws", {
    WebSocketCtor: FakeSocket as any,
    timerHost: timers.host as any,
    heartbeatIntervalMs: 0,
  });
  client.onConnectionState((state) => states.push(state));

  const unsubscribeFirst = client.subscribe({
    channel: "callsign:DAL58",
    listener: () => {},
  });
  const staleSocket = FakeSocket.instances[0];
  unsubscribeFirst();

  client.subscribe({
    channel: "callsign:DAL58",
    params: { flightAware: true },
    listener: () => {},
  });
  const activeSocket = FakeSocket.instances[1];
  activeSocket.open();
  staleSocket.close();

  assert.equal(
    client.state,
    "open",
    "stale connecting socket close should not override the active socket state",
  );
  assert.equal(timers.timeoutCount, 0);
  assert.equal(states.at(-1), "open");
}

{
  FakeSocket.instances = [];
  const timers = createTimerHost();
  const tokenProviders: string[] = [];
  const client = new AdsbaoRealtimeClient("ws://example.test/ws", {
    WebSocketCtor: FakeSocket as any,
    timerHost: timers.host as any,
    heartbeatIntervalMs: 0,
    authTokenFetcher: async (provider) => {
      tokenProviders.push(provider);
      return "signed-flightaware-grant";
    },
  });

  client.subscribe({
    channel: "route:DAL58",
    params: { routeProvider: "adsbdb" },
    listener: () => {},
  });
  const unsubscribeFlightAware = client.subscribe({
    channel: "route:DAL58",
    params: { routeProvider: "flightaware" },
    listener: () => {},
  });
  const socket = FakeSocket.instances[0];
  socket.open();
  for (let i = 0; i < 4 && socket.sent.length < 2; i += 1) {
    await Promise.resolve();
  }

  assert.deepEqual(socket.sent.map((payload) => JSON.parse(payload)), [
    {
      type: "subscribe",
      channel: "route:DAL58",
      params: { routeProvider: "adsbdb" },
    },
    {
      type: "subscribe",
      channel: "route:DAL58",
      params: {
        routeProvider: "flightaware",
        realtimeAuthToken: "signed-flightaware-grant",
      },
    },
  ]);
  assert.deepEqual(tokenProviders, ["flightaware"]);

  unsubscribeFlightAware();
  assert.deepEqual(JSON.parse(socket.sent.at(-1) || "{}"), {
    type: "unsubscribe",
    channel: "route:DAL58",
    params: { routeProvider: "flightaware" },
  });
}

{
  FakeSocket.instances = [];
  const timers = createTimerHost();
  const received: string[] = [];
  const client = new AdsbaoRealtimeClient("ws://example.test/ws", {
    WebSocketCtor: FakeSocket as any,
    timerHost: timers.host as any,
    heartbeatIntervalMs: 0,
    authTokenFetcher: async () => "signed-flightaware-grant",
  });

  client.subscribe({
    channel: "route:DAL58",
    params: { routeProvider: "adsbdb" },
    listener: () => received.push("adsbdb"),
  });
  client.subscribe({
    channel: "route:DAL58",
    params: { routeProvider: "flightaware" },
    listener: () => received.push("flightaware"),
  });
  const socket = FakeSocket.instances[0];
  socket.open();
  for (let i = 0; i < 4 && socket.sent.length < 2; i += 1) {
    await Promise.resolve();
  }

  socket.message({
    type: "route:update",
    channel: "route:DAL58",
    source: "adsbdb",
    fetchedAt: new Date().toISOString(),
    stale: false,
    data: {},
  });
  socket.message({
    type: "route:update",
    channel: "route:DAL58",
    source: "flightaware",
    fetchedAt: new Date().toISOString(),
    stale: false,
    data: {},
  });
  assert.deepEqual(received, ["adsbdb", "flightaware"]);
}

console.log("adsbaoRealtimeClient.test.ts ok");
