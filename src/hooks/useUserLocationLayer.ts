import { useCallback, useEffect, useRef, useState } from "react";
import {
  mergeUserLocationHeading,
  resolveUserLocationWatchUpdate,
  shouldAutoRequestUserLocationLayer,
  type UserLocationRecord,
} from "@/features/airport/map/userLocationModel";
import {
  requestNearMeDeviceOrientationPermission,
  resolveNearMeDeviceHeading,
} from "@/features/airport/nearby/nearMeLocationModel";

type UseUserLocationLayerOptions = {
  enabled?: boolean;
  focalLat?: unknown;
  focalLon?: unknown;
  mapSettingsHydrated?: boolean;
  userLocationEnabled?: boolean;
  setUserLocationPreferences?: (preferences: {
    userLocationEnabled: boolean;
  }) => void;
  t: (key: string) => string;
};

export function useUserLocationLayer({
  enabled = true,
  focalLat,
  focalLon,
  mapSettingsHydrated = false,
  userLocationEnabled = false,
  setUserLocationPreferences,
  t,
}: UseUserLocationLayerOptions) {
  const [userLocation, setUserLocation] = useState<UserLocationRecord | null>(
    null,
  );
  const [userLocationPending, setUserLocationPending] = useState(false);
  const [userLocationNotice, setUserLocationNotice] = useState("");
  const userLocationWatchIdRef = useRef<number | null>(null);
  const userLocationRequestIdRef = useRef(0);
  const userLocationCompassHeadingRef = useRef<number | null>(null);
  const userLocationCompassPermissionRequestedRef = useRef(false);
  const userLocationCompassCleanupRef = useRef<(() => void) | null>(null);
  const autoUserLocationAttemptKeyRef = useRef("");
  const focalRef = useRef({ lat: focalLat, lon: focalLon });

  useEffect(() => {
    focalRef.current = { lat: focalLat, lon: focalLon };
  }, [focalLat, focalLon]);

  useEffect(() => {
    if (!userLocationNotice) return undefined;
    const timer = window.setTimeout(() => setUserLocationNotice(""), 3400);
    return () => window.clearTimeout(timer);
  }, [userLocationNotice]);

  const stopUserLocationWatch = useCallback(() => {
    if (
      userLocationWatchIdRef.current == null ||
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      typeof navigator.geolocation.clearWatch !== "function"
    ) {
      userLocationWatchIdRef.current = null;
      return;
    }

    navigator.geolocation.clearWatch(userLocationWatchIdRef.current);
    userLocationWatchIdRef.current = null;
  }, []);

  const stopUserLocationCompassHeading = useCallback(() => {
    userLocationCompassCleanupRef.current?.();
    userLocationCompassCleanupRef.current = null;
    userLocationCompassHeadingRef.current = null;
  }, []);

  const applyUserLocationCompassHeading = useCallback((headingDeg: number) => {
    userLocationCompassHeadingRef.current = headingDeg;
    setUserLocation((previous) =>
      mergeUserLocationHeading(previous, headingDeg),
    );
  }, []);

  const startUserLocationCompassHeading = useCallback(() => {
    if (
      typeof window === "undefined" ||
      !window.DeviceOrientationEvent ||
      userLocationCompassCleanupRef.current
    ) {
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const headingDeg = resolveNearMeDeviceHeading(event);
      if (headingDeg != null) applyUserLocationCompassHeading(headingDeg);
    };

    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener(
      "deviceorientationabsolute" as keyof WindowEventMap,
      handleOrientation as EventListener,
    );
    userLocationCompassCleanupRef.current = () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener(
        "deviceorientationabsolute" as keyof WindowEventMap,
        handleOrientation as EventListener,
      );
      userLocationCompassCleanupRef.current = null;
    };
  }, [applyUserLocationCompassHeading]);

  const requestUserLocationCompassHeading = useCallback(() => {
    startUserLocationCompassHeading();
    if (userLocationCompassPermissionRequestedRef.current) return;
    userLocationCompassPermissionRequestedRef.current = true;
    void requestNearMeDeviceOrientationPermission().then((permission) => {
      if (permission === "granted") startUserLocationCompassHeading();
    });
  }, [startUserLocationCompassHeading]);

  const clearUserLocation = useCallback(() => {
    userLocationRequestIdRef.current += 1;
    stopUserLocationWatch();
    stopUserLocationCompassHeading();
    setUserLocation(null);
    setUserLocationPending(false);
    setUserLocationNotice("");
  }, [stopUserLocationCompassHeading, stopUserLocationWatch]);

  useEffect(
    () => () => {
      userLocationRequestIdRef.current += 1;
      stopUserLocationWatch();
      stopUserLocationCompassHeading();
    },
    [stopUserLocationCompassHeading, stopUserLocationWatch],
  );

  const requestUserLocation = useCallback(
    ({ requestCompassPermission = false } = {}) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        stopUserLocationCompassHeading();
        setUserLocationPending(false);
        setUserLocationNotice(t("map.locationUnavailable"));
        return;
      }

      if (requestCompassPermission) {
        requestUserLocationCompassHeading();
      } else {
        startUserLocationCompassHeading();
      }

      const requestId = userLocationRequestIdRef.current + 1;
      userLocationRequestIdRef.current = requestId;
      const handlePosition = (position: GeolocationPosition) => {
        if (userLocationRequestIdRef.current !== requestId) return;
        setUserLocationPending(false);
        const result = resolveUserLocationWatchUpdate({
          coords: position.coords,
          focalLat: focalRef.current.lat,
          focalLon: focalRef.current.lon,
        });

        if (!result.location) {
          setUserLocation(null);
          if (!result.locationEnabled) {
            stopUserLocationWatch();
            stopUserLocationCompassHeading();
          }
          setUserLocationNotice(
            result.noticeKey === "tooFar"
              ? t("map.locationTooFar")
              : t("map.locationUnavailable"),
          );
          return;
        }

        setUserLocation(
          mergeUserLocationHeading(
            result.location,
            userLocationCompassHeadingRef.current,
          ),
        );
        setUserLocationNotice("");
      };
      const handleError = (error: GeolocationPositionError) => {
        if (userLocationRequestIdRef.current !== requestId) return;
        stopUserLocationWatch();
        stopUserLocationCompassHeading();
        setUserLocationPending(false);
        setUserLocationNotice(
          error?.code === error?.PERMISSION_DENIED
            ? t("map.locationDenied")
            : t("map.locationUnavailable"),
        );
      };
      const locationOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      };

      setUserLocationPending(true);
      stopUserLocationWatch();
      if (typeof navigator.geolocation.watchPosition === "function") {
        userLocationWatchIdRef.current = navigator.geolocation.watchPosition(
          handlePosition,
          handleError,
          locationOptions,
        );
        navigator.geolocation.getCurrentPosition(
          handlePosition,
          handleError,
          locationOptions,
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        handlePosition,
        handleError,
        locationOptions,
      );
    },
    [
      requestUserLocationCompassHeading,
      startUserLocationCompassHeading,
      stopUserLocationCompassHeading,
      stopUserLocationWatch,
      t,
    ],
  );

  useEffect(() => {
    const shouldAutoRequest = shouldAutoRequestUserLocationLayer({
      nearMe: !enabled,
      mapSettingsHydrated,
      userLocationEnabled,
    });
    if (!shouldAutoRequest) {
      autoUserLocationAttemptKeyRef.current = "";
      if (!mapSettingsHydrated || !userLocationEnabled || !enabled) {
        clearUserLocation();
      }
      return;
    }

    if (userLocation || userLocationPending) return;
    const attemptKey = `${focalRef.current.lat ?? ""}:${focalRef.current.lon ?? ""}`;
    if (autoUserLocationAttemptKeyRef.current === attemptKey) return;
    autoUserLocationAttemptKeyRef.current = attemptKey;
    requestUserLocation({ requestCompassPermission: true });
  }, [
    clearUserLocation,
    enabled,
    mapSettingsHydrated,
    requestUserLocation,
    userLocation,
    userLocationEnabled,
    userLocationPending,
  ]);

  const toggleUserLocation = useCallback(() => {
    if (userLocationEnabled || userLocation) {
      setUserLocationPreferences?.({ userLocationEnabled: false });
      clearUserLocation();
      return;
    }

    setUserLocationPreferences?.({ userLocationEnabled: true });
    requestUserLocation({ requestCompassPermission: true });
  }, [
    clearUserLocation,
    requestUserLocation,
    setUserLocationPreferences,
    userLocation,
    userLocationEnabled,
  ]);

  return {
    userLocation,
    userLocationActive: userLocationEnabled || Boolean(userLocation),
    userLocationPending,
    userLocationNotice,
    requestUserLocation,
    toggleUserLocation,
  };
}
