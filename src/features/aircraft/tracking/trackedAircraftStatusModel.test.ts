import assert from "node:assert/strict";

import { resolveTrackedAircraftStatusUpdatedDate } from "./trackedAircraftStatusModel";

{
  const result = resolveTrackedAircraftStatusUpdatedDate({
    aircraft: {
      positionTime: "2026-06-14T04:20:00.000Z",
      positionQuality: {
        source: "flightaware",
        sourceUpdatedAt: "2026-06-14T04:25:16.000Z",
        fetchedAt: "2026-06-14T04:25:20.000Z",
      },
    },
    fetchedAt: "2026-06-14T04:26:20.000Z",
    feedSource: "flightaware",
    trackingState: { status: "flightaware_active" },
  });

  assert.equal(result?.toISOString(), "2026-06-14T04:25:16.000Z");
}

{
  const result = resolveTrackedAircraftStatusUpdatedDate({
    aircraft: {
      positionTime: "2026-06-14T04:20:00.000Z",
      positionQuality: {
        source: "adsb_lol",
        sourceUpdatedAt: "2026-06-14T04:20:12.000Z",
        fetchedAt: "2026-06-14T04:21:00.000Z",
      },
    },
    fetchedAt: "2026-06-14T04:22:00.000Z",
    feedSource: "adsb.lol",
    trackingState: { status: "adsb_live" },
  });

  assert.equal(result?.toISOString(), "2026-06-14T04:20:12.000Z");
}

{
  const result = resolveTrackedAircraftStatusUpdatedDate({
    aircraft: {
      positionTime: "2026-06-14T04:20:00.000Z",
      positionQuality: {
        source: "flightaware",
        sourceUpdatedAt: "2026-06-14T04:25:16.000Z",
        fetchedAt: "2026-06-14T04:27:20.000Z",
      },
    },
    feedSource: "flightaware",
  });

  assert.equal(result?.toISOString(), "2026-06-14T04:25:16.000Z");
}

{
  const result = resolveTrackedAircraftStatusUpdatedDate({
    aircraft: {
      positionTime: "2026-06-14T04:20:00.000Z",
      positionQuality: {
        source: "adsb_lol",
        sourceUpdatedAt: "2026-06-14T04:20:12.000Z",
      },
    },
  });

  assert.equal(result?.toISOString(), "2026-06-14T04:20:12.000Z");
}

{
  const result = resolveTrackedAircraftStatusUpdatedDate({
    aircraft: {
      positionQuality: {
        fetchedAt: "2026-06-14T04:27:20.000Z",
      },
    },
    fetchedAt: "2026-06-14T04:28:20.000Z",
  });

  assert.equal(result?.toISOString(), "2026-06-14T04:28:20.000Z");
}

console.log("trackedAircraftStatusModel.test.ts ok");
