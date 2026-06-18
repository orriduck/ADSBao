import assert from "node:assert/strict";

import {
  resolveClientDeviceLayoutProfile,
  resolveClientDeviceProfile,
  resolveClientViewportSnapshot,
} from "./clientDeviceModel";

{
  assert.deepEqual(
    resolveClientViewportSnapshot({
      layoutViewport: { width: 393, height: 852 },
      visualViewport: { width: 852, height: 393 },
    }),
    { width: 393, height: 852 },
  );

  assert.deepEqual(
    resolveClientViewportSnapshot({
      layoutViewport: { width: 0, height: 0 },
      visualViewport: { width: 852, height: 393 },
    }),
    { width: 852, height: 393 },
  );
}

{
  const profile = resolveClientDeviceProfile({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
    userAgentData: { mobile: true, platform: "iOS" },
    viewport: { width: 852, height: 393 },
    safeAreaInsets: { top: "0px", right: "47px", bottom: "21px", left: "47px" },
    mediaDevices: { getUserMedia: () => undefined },
  });

  assert.equal(profile.deviceClass, "phone");
  assert.equal(profile.system, "ios");
  assert.equal(profile.orientation, "landscape");
  assert.deepEqual(profile.viewport, { width: 852, height: 393 });
  assert.equal(profile.isMobileDevice, true);
  assert.equal(profile.hasCamera, true);
  assert.equal(profile.hasHorizontalViewportObstruction, true);

  const layout = resolveClientDeviceLayoutProfile({
    profile,
  });
  assert.equal(layout.layoutMode, "desktop");
  assert.equal(layout.isMobileLayout, false);
  assert.equal(layout.useDesktopMobileLandscapeLayout, true);
  assert.deepEqual(layout.safeAreaCssVariables, {
    "--app-safe-area-left": "47px",
    "--app-safe-area-right": "47px",
    "--app-safe-area-bottom": "21px",
  });
}

{
  const profile = resolveClientDeviceProfile({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
    viewport: { width: 852, height: 393 },
    safeAreaInsets: { top: "0px", right: "47px", bottom: "21px", left: "0px" },
  });
  const layout = resolveClientDeviceLayoutProfile({
    profile,
  });

  assert.equal(layout.layoutMode, "desktop");
  assert.equal(layout.isMobileLayout, false);
  assert.equal(layout.useDesktopMobileLandscapeLayout, true);
  assert.deepEqual(layout.safeAreaCssVariables, {
    "--app-safe-area-left": "0px",
    "--app-safe-area-right": "47px",
    "--app-safe-area-bottom": "21px",
  });
}

{
  const profile = resolveClientDeviceProfile({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
    platform: "MacIntel",
    maxTouchPoints: 5,
    viewport: { width: 1366, height: 1024 },
  });

  assert.equal(profile.deviceClass, "tablet");
  assert.equal(profile.system, "ipados");
  assert.equal(profile.orientation, "landscape");
  assert.equal(profile.isMobileDevice, true);
  assert.equal(profile.hasCamera, true);
  assert.equal(
    resolveClientDeviceLayoutProfile({ profile }).layoutMode,
    "desktop",
  );
}

{
  const profile = resolveClientDeviceProfile({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
    viewport: { width: 393, height: 852 },
    safeAreaInsets: { top: "59px", right: "0px", bottom: "34px", left: "0px" },
  });
  const layout = resolveClientDeviceLayoutProfile({ profile });

  assert.equal(layout.layoutMode, "mobile");
  assert.equal(layout.isMobileLayout, true);
  assert.equal(layout.useDesktopMobileLandscapeLayout, false);
  assert.equal(layout.safeAreaCssVariables, undefined);
}

{
  const profile = resolveClientDeviceProfile({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    platform: "MacIntel",
    maxTouchPoints: 0,
    userAgentData: { mobile: false, platform: "macOS" },
    viewport: { width: 1440, height: 900 },
    mediaDevices: { getUserMedia: () => undefined },
  });

  assert.equal(profile.deviceClass, "desktop");
  assert.equal(profile.system, "macos");
  assert.equal(profile.orientation, "landscape");
  assert.equal(profile.isMobileDevice, false);
  assert.equal(profile.hasCamera, true);
  assert.equal(profile.hasHorizontalViewportObstruction, false);
  const layout = resolveClientDeviceLayoutProfile({ profile });
  assert.equal(layout.layoutMode, "desktop");
  assert.equal(layout.isMobileLayout, false);
  assert.equal(layout.useDesktopMobileLandscapeLayout, false);
}
