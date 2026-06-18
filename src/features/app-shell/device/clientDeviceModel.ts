type ClientNavigatorUserAgentData = {
  mobile?: boolean;
  platform?: string;
};

type ClientMediaDevices = {
  enumerateDevices?: unknown;
  getUserMedia?: unknown;
};

export type ClientDeviceSystem =
  | "ios"
  | "ipados"
  | "android"
  | "macos"
  | "windows"
  | "linux"
  | "unknown";

export type ClientDeviceClass = "phone" | "tablet" | "desktop" | "unknown";
export type ClientDeviceOrientation = "portrait" | "landscape" | "unknown";
export type ClientLayoutMode = "mobile" | "desktop";

export type ClientDeviceSafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type ClientDeviceSafeAreaInsetsInput = {
  top?: unknown;
  right?: unknown;
  bottom?: unknown;
  left?: unknown;
};

export type ClientDeviceViewport = {
  width?: number;
  height?: number;
};

export type ClientDeviceSnapshot = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  userAgentData?: ClientNavigatorUserAgentData | null;
  mediaDevices?: ClientMediaDevices | null;
  viewport?: ClientDeviceViewport | null;
  safeAreaInsets?: ClientDeviceSafeAreaInsetsInput | null;
};

export type ClientDeviceProfile = {
  deviceClass: ClientDeviceClass;
  system: ClientDeviceSystem;
  viewport: ClientDeviceViewport | null;
  orientation: ClientDeviceOrientation;
  isMobileDevice: boolean;
  hasCamera: boolean;
  hasHorizontalViewportObstruction: boolean;
  safeAreaInsets: ClientDeviceSafeAreaInsets;
};

export type ClientDeviceLayoutProfile = {
  layoutMode: ClientLayoutMode;
  isMobileLayout: boolean;
  orientation: ClientDeviceOrientation;
  isMobileDevice: boolean;
  hasHorizontalViewportObstruction: boolean;
  safeAreaInsets: ClientDeviceSafeAreaInsets;
  safeAreaCssVariables?: Record<string, string>;
  useDesktopMobileLandscapeLayout: boolean;
};

const DEFAULT_LAYOUT_MOBILE_BREAKPOINT_PX = 768;

const EMPTY_SAFE_AREA_INSETS: ClientDeviceSafeAreaInsets = Object.freeze({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "string") {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isIpadOsDesktopUa({
  maxTouchPoints,
  platform,
  userAgent,
}: {
  maxTouchPoints: number;
  platform: string;
  userAgent: string;
}) {
  return (
    maxTouchPoints > 1 &&
    (platform === "macintel" || platform === "macos") &&
    userAgent.includes("macintosh")
  );
}

function resolveClientDeviceSystem({
  maxTouchPoints,
  platform,
  userAgent,
}: {
  maxTouchPoints: number;
  platform: string;
  userAgent: string;
}): ClientDeviceSystem {
  if (userAgent.includes("ipad") || platform === "ipad") return "ipados";
  if (/\b(iphone|ipod)\b/.test(userAgent) || platform === "iphone") return "ios";
  if (isIpadOsDesktopUa({ maxTouchPoints, platform, userAgent })) return "ipados";
  if (userAgent.includes("android") || platform.includes("android")) return "android";
  if (platform.includes("mac") || userAgent.includes("mac os x")) return "macos";
  if (platform.includes("win") || userAgent.includes("windows")) return "windows";
  if (platform.includes("linux") || userAgent.includes("linux")) return "linux";
  return "unknown";
}

function resolveClientDeviceClass({
  maxTouchPoints,
  mobileHint,
  platform,
  system,
  userAgent,
}: {
  maxTouchPoints: number;
  mobileHint: boolean;
  platform: string;
  system: ClientDeviceSystem;
  userAgent: string;
}): ClientDeviceClass {
  if (system === "ios") return "phone";
  if (system === "ipados") return "tablet";
  if (system === "android") {
    return userAgent.includes("mobile") || mobileHint ? "phone" : "tablet";
  }
  if (/\b(tablet|kindle|silk|playbook)\b/.test(userAgent)) return "tablet";
  if (
    /\b(mobile|iphone|ipod|windows phone|iemobile|blackberry|bb10|opera mini)\b/.test(
      userAgent,
    )
  ) {
    return "phone";
  }
  if (isIpadOsDesktopUa({ maxTouchPoints, platform, userAgent })) return "tablet";
  if (mobileHint) return "phone";
  if (system === "unknown") return "unknown";
  return "desktop";
}

function resolveClientDeviceOrientation(
  viewport: ClientDeviceViewport | null | undefined,
): ClientDeviceOrientation {
  const width = toFiniteNumber(viewport?.width);
  const height = toFiniteNumber(viewport?.height);
  if (width <= 0 || height <= 0 || width === height) return "unknown";
  return width > height ? "landscape" : "portrait";
}

function normalizeSafeAreaInsets(
  safeAreaInsets: ClientDeviceSafeAreaInsetsInput | null | undefined,
): ClientDeviceSafeAreaInsets {
  if (!safeAreaInsets) return EMPTY_SAFE_AREA_INSETS;
  return {
    top: Math.max(0, toFiniteNumber(safeAreaInsets.top)),
    right: Math.max(0, toFiniteNumber(safeAreaInsets.right)),
    bottom: Math.max(0, toFiniteNumber(safeAreaInsets.bottom)),
    left: Math.max(0, toFiniteNumber(safeAreaInsets.left)),
  };
}

function normalizeViewport(
  viewport: ClientDeviceViewport | null | undefined,
): ClientDeviceViewport | null {
  const width = toFiniteNumber(viewport?.width);
  const height = toFiniteNumber(viewport?.height);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

export function resolveClientViewportSnapshot({
  layoutViewport,
  visualViewport,
}: {
  layoutViewport?: ClientDeviceViewport | null;
  visualViewport?: ClientDeviceViewport | null;
}): ClientDeviceViewport | null {
  return normalizeViewport(layoutViewport) || normalizeViewport(visualViewport);
}

function resolveHasCamera({
  deviceClass,
  mediaDevices,
}: {
  deviceClass: ClientDeviceClass;
  mediaDevices: ClientMediaDevices | null | undefined;
}) {
  const hasCameraApi =
    typeof mediaDevices?.getUserMedia === "function" ||
    typeof mediaDevices?.enumerateDevices === "function";

  return hasCameraApi || deviceClass === "phone" || deviceClass === "tablet";
}

export function resolveClientDeviceProfile(
  snapshot: ClientDeviceSnapshot | null | undefined,
): ClientDeviceProfile {
  const userAgentData = snapshot?.userAgentData;
  const userAgent = normalizeText(snapshot?.userAgent);
  const platform = normalizeText(userAgentData?.platform || snapshot?.platform);
  const maxTouchPoints = toFiniteNumber(snapshot?.maxTouchPoints);
  const mobileHint = userAgentData?.mobile === true;
  const system = resolveClientDeviceSystem({
    maxTouchPoints,
    platform,
    userAgent,
  });
  const deviceClass = resolveClientDeviceClass({
    maxTouchPoints,
    mobileHint,
    platform,
    system,
    userAgent,
  });
  const safeAreaInsets = normalizeSafeAreaInsets(snapshot?.safeAreaInsets);
  const viewport = normalizeViewport(snapshot?.viewport);

  return {
    deviceClass,
    system,
    viewport,
    orientation: resolveClientDeviceOrientation(viewport),
    isMobileDevice: deviceClass === "phone" || deviceClass === "tablet",
    hasCamera: resolveHasCamera({
      deviceClass,
      mediaDevices: snapshot?.mediaDevices,
    }),
    hasHorizontalViewportObstruction:
      safeAreaInsets.left > 0 || safeAreaInsets.right > 0,
    safeAreaInsets,
  };
}

function resolveClientLayoutMode({
  mobileBreakpointPx = DEFAULT_LAYOUT_MOBILE_BREAKPOINT_PX,
  profile,
}: {
  mobileBreakpointPx?: number;
  profile: ClientDeviceProfile | null | undefined;
}): ClientLayoutMode {
  const orientation = profile?.orientation || "unknown";
  const isMobileDevice = profile?.isMobileDevice === true;
  const width = toFiniteNumber(profile?.viewport?.width);
  const breakpoint = Math.max(1, toFiniteNumber(mobileBreakpointPx));

  if (isMobileDevice && orientation === "landscape") return "desktop";
  if (width > 0 && width < breakpoint) return "mobile";
  return "desktop";
}

export function resolveClientDeviceLayoutProfile({
  mobileBreakpointPx = DEFAULT_LAYOUT_MOBILE_BREAKPOINT_PX,
  profile,
}: {
  mobileBreakpointPx?: number;
  profile: ClientDeviceProfile | null | undefined;
}): ClientDeviceLayoutProfile {
  const layoutMode = resolveClientLayoutMode({ mobileBreakpointPx, profile });
  const isMobileLayout = layoutMode === "mobile";
  const orientation = profile?.orientation || "unknown";
  const isMobileDevice = profile?.isMobileDevice === true;
  const hasHorizontalViewportObstruction =
    profile?.hasHorizontalViewportObstruction === true;
  const safeAreaInsets =
    orientation === "landscape" && hasHorizontalViewportObstruction
      ? normalizeSafeAreaInsets(profile?.safeAreaInsets)
      : EMPTY_SAFE_AREA_INSETS;
  const shouldApplySafeAreaVariables =
    orientation === "landscape" && hasHorizontalViewportObstruction;
  const useDesktopMobileLandscapeLayout =
    layoutMode === "desktop" && isMobileDevice && orientation === "landscape";
  const safeAreaCssVariables = shouldApplySafeAreaVariables
    ? {
        "--app-safe-area-left": `${safeAreaInsets.left}px`,
        "--app-safe-area-right": `${safeAreaInsets.right}px`,
        "--app-safe-area-bottom": `${safeAreaInsets.bottom}px`,
      }
    : undefined;

  return {
    layoutMode,
    isMobileLayout,
    orientation,
    isMobileDevice,
    hasHorizontalViewportObstruction,
    safeAreaInsets,
    safeAreaCssVariables,
    useDesktopMobileLandscapeLayout,
  };
}

export function readClientSafeAreaInsets(): ClientDeviceSafeAreaInsets {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return EMPTY_SAFE_AREA_INSETS;
  }

  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:fixed",
    "visibility:hidden",
    "pointer-events:none",
    "inset:0",
    "padding-top:env(safe-area-inset-top)",
    "padding-right:env(safe-area-inset-right)",
    "padding-bottom:env(safe-area-inset-bottom)",
    "padding-left:env(safe-area-inset-left)",
  ].join(";");
  document.documentElement.appendChild(probe);

  const computed = window.getComputedStyle(probe);
  const safeAreaInsets = normalizeSafeAreaInsets({
    top: computed.paddingTop,
    right: computed.paddingRight,
    bottom: computed.paddingBottom,
    left: computed.paddingLeft,
  });
  probe.remove();
  return safeAreaInsets;
}

export function getClientDeviceSnapshot({
  includeSafeAreaInsets = false,
}: {
  includeSafeAreaInsets?: boolean;
} = {}): ClientDeviceSnapshot | null {
  if (typeof navigator === "undefined") return null;

  const clientNavigator = navigator as Navigator & {
    userAgentData?: ClientNavigatorUserAgentData;
  };
  const visualViewport =
    typeof window !== "undefined" ? window.visualViewport : null;

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
    mediaDevices: clientNavigator.mediaDevices,
    viewport:
      typeof window === "undefined"
        ? null
        : resolveClientViewportSnapshot({
            layoutViewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
            visualViewport,
          }),
    safeAreaInsets: includeSafeAreaInsets ? readClientSafeAreaInsets() : null,
  };
}
