import assert from "node:assert/strict";

import { resolveClientDeviceProfile } from "@/features/app-shell/device/clientDeviceModel";
import {
  shouldEnablePlaneHunterForClientDevice,
  shouldEnablePlaneHunterForClientDeviceProfile,
} from "./planeHunterDeviceModel";

{
  const profile = resolveClientDeviceProfile({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
    userAgentData: { mobile: true, platform: "iOS" },
    mediaDevices: { getUserMedia: () => undefined },
  });

  assert.equal(
    shouldEnablePlaneHunterForClientDeviceProfile(profile),
    true,
    "provider-sampled mobile profiles should expose Plane Hunter",
  );
}

{
  assert.equal(
    shouldEnablePlaneHunterForClientDevice({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      platform: "MacIntel",
      maxTouchPoints: 0,
      userAgentData: { mobile: false, platform: "macOS" },
    }),
    false,
    "desktop macOS should not expose Plane Hunter",
  );
}

{
  assert.equal(
    shouldEnablePlaneHunterForClientDevice({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
      userAgentData: { mobile: true, platform: "iOS" },
    }),
    true,
    "mobile system fields should expose Plane Hunter",
  );
}

{
  assert.equal(
    shouldEnablePlaneHunterForClientDevice({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1",
      platform: "MacIntel",
      maxTouchPoints: 0,
      userAgentData: { mobile: false, platform: "macOS" },
    }),
    true,
    "Chrome mobile emulation should expose Plane Hunter through the emulated UA",
  );
}

{
  assert.equal(
    shouldEnablePlaneHunterForClientDevice({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    }),
    true,
    "iPadOS desktop-style UA should still expose Plane Hunter",
  );
}
