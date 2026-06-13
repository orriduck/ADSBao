type PlaneHunterNavigatorUserAgentData = {
  mobile?: boolean;
  platform?: string;
};

export type PlaneHunterClientDevice = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  userAgentData?: PlaneHunterNavigatorUserAgentData | null;
};

export function shouldEnablePlaneHunterForClientDevice(
  device: PlaneHunterClientDevice | null | undefined,
) {
  const userAgentData = device?.userAgentData;
  if (userAgentData?.mobile === true) return true;

  const userAgent = String(device?.userAgent || "").toLowerCase();
  const platform = String(userAgentData?.platform || device?.platform || "").toLowerCase();
  const maxTouchPoints = Number(device?.maxTouchPoints || 0);

  if (
    /\b(mobile|iphone|ipod|android|windows phone|iemobile|blackberry|bb10|opera mini)\b/.test(
      userAgent,
    )
  ) {
    return true;
  }

  if (/\b(iphone|ipad|ipod|android)\b/.test(platform)) {
    return true;
  }

  if (userAgent.includes("ipad")) return true;

  // iPadOS can request the desktop Safari UA, reporting "Macintosh" with touch.
  return (
    maxTouchPoints > 1 &&
    (platform === "macintel" || platform === "macos") &&
    userAgent.includes("macintosh")
  );
}

export function getPlaneHunterClientDevice(): PlaneHunterClientDevice | null {
  if (typeof navigator === "undefined") return null;

  const clientNavigator = navigator as Navigator & {
    userAgentData?: PlaneHunterNavigatorUserAgentData;
  };

  return {
    userAgent: clientNavigator.userAgent,
    platform: clientNavigator.platform,
    maxTouchPoints: clientNavigator.maxTouchPoints,
    userAgentData: clientNavigator.userAgentData
      ? {
          mobile: clientNavigator.userAgentData.mobile,
          platform: clientNavigator.userAgentData.platform,
        }
      : null,
  };
}
