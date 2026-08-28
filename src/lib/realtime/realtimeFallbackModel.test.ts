import assert from "node:assert/strict";

import { shouldUseRealtimeFallback } from "./realtimeFallbackModel";

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "loading",
    hasEvent: false,
    graceExpired: false,
    eventType: "",
    hasEventData: false,
  });

  assert.equal(
    fallback,
    false,
    "initial SSE connection should wait for the first event before fallback polling",
  );
}

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "loading",
    hasEvent: false,
    graceExpired: false,
    eventType: "nearby:snapshot",
    hasEventData: false,
  });

  assert.equal(
    fallback,
    false,
    "static nearby context must preserve the initial traffic-data grace window",
  );
}

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "reconnecting",
    hasEvent: false,
    graceExpired: true,
    eventType: "",
    hasEventData: false,
  });

  assert.equal(
    fallback,
    true,
    "reconnecting SSE should fall back after the first-event grace window",
  );
}

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "live",
    hasEvent: false,
    graceExpired: false,
    eventType: "",
    hasEventData: false,
  });

  assert.equal(
    fallback,
    false,
    "live SSE connection should not fallback while waiting for the first event",
  );
}

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "live",
    hasEvent: false,
    graceExpired: true,
    eventType: "nearby:snapshot",
    hasEventData: false,
  });

  assert.equal(
    fallback,
    true,
    "live SSE without traffic should use one HTTP fallback only after the grace window",
  );
}

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "live",
    hasEvent: true,
    graceExpired: false,
    eventType: "nearby:status",
    hasEventData: false,
  });

  assert.equal(
    fallback,
    true,
    "SSE status without cached event data should activate fallback polling",
  );
}

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "stale",
    hasEvent: true,
    graceExpired: false,
    eventType: "nearby:status",
    hasEventData: true,
  });

  assert.equal(
    fallback,
    false,
    "cached traffic in a status frame remains a valid source while retry waits",
  );
}

console.log("realtimeFallbackModel.test.ts ok");
