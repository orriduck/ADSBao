import assert from "node:assert/strict";
import { AdsbaoRealtimeClient } from "./adsbaoRealtimeClient";

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

console.log("adsbaoRealtimeClient.test.ts ok");
