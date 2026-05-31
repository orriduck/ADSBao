import assert from "node:assert/strict";

import { formatFlightRouteQueueAudit } from "./useFlightRoutes";

assert.equal(
  formatFlightRouteQueueAudit({
    done: 50,
    in_queue: 1,
    inflight: 0,
    not_do: 0,
  }),
  "[audit:flight-route-queue]: done=50,in_queue=1,inflight=0,not_do=0",
);
