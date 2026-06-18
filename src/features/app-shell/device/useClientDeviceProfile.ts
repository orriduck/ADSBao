import { useEffect, useState } from "react";
import {
  getClientDeviceSnapshot,
  resolveClientDeviceProfile,
} from "./clientDeviceModel";

export const getCurrentClientDeviceProfile = (includeSafeAreaInsets = false) =>
  resolveClientDeviceProfile(
    getClientDeviceSnapshot({ includeSafeAreaInsets }),
  );

export function useClientDeviceProfile({
  includeSafeAreaInsets = false,
}: {
  includeSafeAreaInsets?: boolean;
} = {}) {
  const [profile, setProfile] = useState(() =>
    getCurrentClientDeviceProfile(includeSafeAreaInsets),
  );

  useEffect(() => {
    const syncProfile = () => {
      setProfile(getCurrentClientDeviceProfile(includeSafeAreaInsets));
    };

    syncProfile();
    window.addEventListener("resize", syncProfile);
    window.addEventListener("orientationchange", syncProfile);
    window.visualViewport?.addEventListener("resize", syncProfile);

    return () => {
      window.removeEventListener("resize", syncProfile);
      window.removeEventListener("orientationchange", syncProfile);
      window.visualViewport?.removeEventListener("resize", syncProfile);
    };
  }, [includeSafeAreaInsets]);

  return profile;
}
