import assert from "node:assert/strict";

import { shouldUseRealtimeFallback } from "./realtimeFallbackModel";

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "closed",
    hasEvent: false,
    graceExpired: false,
    eventType: "",
    hasEventData: false,
  });

  assert.equal(
    fallback,
    false,
    "initial closed realtime connection should wait for the first event before fallback polling",
  );
}

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "closed",
    hasEvent: false,
    graceExpired: true,
    eventType: "",
    hasEventData: false,
  });

  assert.equal(
    fallback,
    true,
    "closed realtime connection should fall back after the first-event grace window",
  );
}

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "open",
    hasEvent: false,
    graceExpired: false,
    eventType: "",
    hasEventData: false,
  });

  assert.equal(
    fallback,
    false,
    "open realtime connection should not fallback while waiting for the first event",
  );
}

{
  const fallback = shouldUseRealtimeFallback({
    available: true,
    connectionState: "open",
    hasEvent: true,
    graceExpired: false,
    eventType: "channel:error",
    hasEventData: false,
  });

  assert.equal(
    fallback,
    true,
    "channel errors without cached event data should activate fallback polling",
  );
}

console.log("realtimeFallbackModel.test.ts ok");
