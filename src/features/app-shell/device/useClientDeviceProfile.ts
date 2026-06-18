import { useEffect, useState } from "react";
import {
  type ClientDeviceProfile,
  getClientDeviceSnapshot,
  resolveClientDeviceProfile,
} from "./clientDeviceModel";

export const getCurrentClientDeviceProfile = (includeSafeAreaInsets = false) =>
  resolveClientDeviceProfile(
    getClientDeviceSnapshot({ includeSafeAreaInsets }),
  );

function areClientDeviceProfilesEqual(
  currentProfile: ClientDeviceProfile,
  nextProfile: ClientDeviceProfile,
) {
  return (
    currentProfile.deviceClass === nextProfile.deviceClass &&
    currentProfile.system === nextProfile.system &&
    currentProfile.viewport?.width === nextProfile.viewport?.width &&
    currentProfile.viewport?.height === nextProfile.viewport?.height &&
    currentProfile.orientation === nextProfile.orientation &&
    currentProfile.isMobileDevice === nextProfile.isMobileDevice &&
    currentProfile.hasCamera === nextProfile.hasCamera &&
    currentProfile.hasHorizontalViewportObstruction ===
      nextProfile.hasHorizontalViewportObstruction &&
    currentProfile.safeAreaInsets.top === nextProfile.safeAreaInsets.top &&
    currentProfile.safeAreaInsets.right === nextProfile.safeAreaInsets.right &&
    currentProfile.safeAreaInsets.bottom === nextProfile.safeAreaInsets.bottom &&
    currentProfile.safeAreaInsets.left === nextProfile.safeAreaInsets.left
  );
}

export function useClientDeviceProfile({
  includeSafeAreaInsets = false,
}: {
  includeSafeAreaInsets?: boolean;
} = {}) {
  const [profile, setProfile] = useState(() =>
    getCurrentClientDeviceProfile(includeSafeAreaInsets),
  );

  useEffect(() => {
    let frameId: number | null = null;
    let timeoutIds: number[] = [];
    const visualViewport = window.visualViewport;
    const screenOrientation = window.screen?.orientation;

    const syncProfile = () => {
      setProfile((currentProfile) => {
        const nextProfile = getCurrentClientDeviceProfile(includeSafeAreaInsets);
        return areClientDeviceProfilesEqual(currentProfile, nextProfile)
          ? currentProfile
          : nextProfile;
      });
    };

    const scheduleProfileSync = () => {
      syncProfile();

      if (frameId != null) window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        syncProfile();
      });
      timeoutIds = [120, 360].map((delayMs) =>
        window.setTimeout(syncProfile, delayMs),
      );
    };

    const syncProfileWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleProfileSync();
    };

    scheduleProfileSync();
    window.addEventListener("resize", scheduleProfileSync);
    window.addEventListener("orientationchange", scheduleProfileSync);
    window.addEventListener("pageshow", scheduleProfileSync);
    window.addEventListener("focus", scheduleProfileSync);
    document.addEventListener("visibilitychange", syncProfileWhenVisible);
    visualViewport?.addEventListener("resize", scheduleProfileSync);
    visualViewport?.addEventListener("scroll", scheduleProfileSync);
    screenOrientation?.addEventListener?.("change", scheduleProfileSync);

    return () => {
      if (frameId != null) window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.removeEventListener("resize", scheduleProfileSync);
      window.removeEventListener("orientationchange", scheduleProfileSync);
      window.removeEventListener("pageshow", scheduleProfileSync);
      window.removeEventListener("focus", scheduleProfileSync);
      document.removeEventListener("visibilitychange", syncProfileWhenVisible);
      visualViewport?.removeEventListener("resize", scheduleProfileSync);
      visualViewport?.removeEventListener("scroll", scheduleProfileSync);
      screenOrientation?.removeEventListener?.("change", scheduleProfileSync);
    };
  }, [includeSafeAreaInsets]);

  return profile;
}
