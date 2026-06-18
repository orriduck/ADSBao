import assert from "node:assert/strict";

import { getAirportSidebarMode } from "./sidebarDisplay";
import { resolveClientDeviceProfile } from "@/features/app-shell/device/clientDeviceModel";

{
  const profile = resolveClientDeviceProfile({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
    viewport: { width: 667, height: 375 },
  });

  assert.equal(getAirportSidebarMode(667, profile), "desktop");
}

{
  const profile = resolveClientDeviceProfile({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
    viewport: { width: 375, height: 667 },
  });

  assert.equal(getAirportSidebarMode(375, profile), "mobile");
}

assert.equal(getAirportSidebarMode(767), "mobile");
assert.equal(getAirportSidebarMode(768), "desktop");
