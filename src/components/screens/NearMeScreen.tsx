import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocateFixed } from "lucide-react";
import AirportExplorer from "@/components/airport/explorer/AirportExplorer";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useClientDeviceProfile } from "@/features/app-shell/device/useClientDeviceProfile";
import { setLocaleSearchParam } from "@/features/app-shell/i18n/i18nModel";
import {
  buildNearMeLocationFromCoords,
  requestNearMeDeviceOrientationPermission,
  resolveNearMeDeviceHeading,
  shouldRefreshNearMeSidebarLocation,
  shouldUpdateNearMeLocation,
  type NearMeLocation,
} from "@/features/airport/nearby/nearMeLocationModel";

// `/here` — explorer view centered on the user's current position.
export default function NearMeScreen() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const clientDeviceProfile = useClientDeviceProfile();
  const useOneShotLocation = clientDeviceProfile.deviceClass === "desktop";
  const [coords, setCoords] = useState<NearMeLocation | null>(null);
  const [sidebarCoords, setSidebarCoords] = useState<NearMeLocation | null>(null);
  const [status, setStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastTime, setLastTime] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const initialRequestRef = useRef(true);
  const compassHeadingRef = useRef<number | null>(null);
  const compassPermissionRequestedRef = useRef(false);
  const compassCleanupRef = useRef<(() => void) | null>(null);

  const applyCompassHeading = useCallback((headingDeg: number) => {
    compassHeadingRef.current = headingDeg;
    setCoords((previous) => {
      if (!previous || previous.headingDeg === headingDeg) return previous;
      return {
        ...previous,
        headingDeg,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const startCompassHeading = useCallback(() => {
    if (
      typeof window === "undefined" ||
      !window.DeviceOrientationEvent ||
      compassCleanupRef.current
    ) {
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const headingDeg = resolveNearMeDeviceHeading(event);
      if (headingDeg != null) applyCompassHeading(headingDeg);
    };

    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener(
      "deviceorientationabsolute" as keyof WindowEventMap,
      handleOrientation as EventListener,
    );
    compassCleanupRef.current = () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener(
        "deviceorientationabsolute" as keyof WindowEventMap,
        handleOrientation as EventListener,
      );
      compassCleanupRef.current = null;
    };
  }, [applyCompassHeading]);

  const requestCompassHeading = useCallback(() => {
    startCompassHeading();
    if (compassPermissionRequestedRef.current) return;
    compassPermissionRequestedRef.current = true;
    void requestNearMeDeviceOrientationPermission().then((permission) => {
      if (permission === "granted") startCompassHeading();
    });
  }, [startCompassHeading]);

  // Desktop: one-shot getCurrentPosition + manual refresh.
  // Mobile: continuous watchPosition with position filtering and live heading updates.
  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      setErrorMessage(t("nearMe.unsupported"));
      return;
    }

    if (watchIdRef.current != null && typeof navigator.geolocation.clearWatch === "function") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Only flip to "requesting" on the initial attempt — refreshes
    // keep the current view in place while the new fix loads.
    if (initialRequestRef.current) {
      setStatus("requesting");
      initialRequestRef.current = false;
    }
    setErrorMessage("");

    const handleSuccess = (position: GeolocationPosition) => {
      const rawLocation = buildNearMeLocationFromCoords(position.coords);
      if (!rawLocation) {
        setStatus("unavailable");
        setErrorMessage(t("nearMe.unsupported"));
        return;
      }
      const nextLocation =
        compassHeadingRef.current == null
          ? rawLocation
          : {
              ...rawLocation,
              headingDeg: compassHeadingRef.current,
            };
      setStatus("granted");
      setRefreshing(false);
      if (useOneShotLocation) {
        setLastTime(
          new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date()),
        );
      }
      setCoords((previous) => {
        if (shouldUpdateNearMeLocation(previous, nextLocation)) return nextLocation;
        return previous;
      });
      setSidebarCoords((previous) => {
        if (shouldRefreshNearMeSidebarLocation(previous, nextLocation)) {
          return nextLocation;
        }
        return previous;
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      if (error?.code === error?.PERMISSION_DENIED) {
        setStatus("denied");
        setErrorMessage(t("nearMe.denied"));
      } else {
        setStatus("unavailable");
        setErrorMessage(error?.message || t("nearMe.unsupported"));
      }
      setRefreshing(false);
    };

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: useOneShotLocation ? 0 : 30_000,
    };

    if (useOneShotLocation) {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
    } else {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        options,
      );
    }
  }, [t, useOneShotLocation]);

  const handleRequestLocation = useCallback(() => {
    requestCompassHeading();
    requestLocation();
  }, [requestCompassHeading, requestLocation]);

  const handleNearMeInteraction = useCallback(() => {
    requestCompassHeading();
  }, [requestCompassHeading]);

  const handleRefresh = useCallback(() => {
    requestCompassHeading();
    setRefreshing(true);
    requestLocation();
  }, [requestCompassHeading, requestLocation]);

  useEffect(() => {
    requestCompassHeading();
    requestLocation();
    return () => {
      if (watchIdRef.current != null && typeof navigator !== "undefined" && typeof navigator.geolocation?.clearWatch === "function") {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      compassCleanupRef.current?.();
    };
  }, [requestCompassHeading, requestLocation]);

  const airport = useMemo(
    () =>
      coords
        ? {
            icao: "",
            name: t("sidebar.nearMeTitle"),
            lat: coords.lat,
            lon: coords.lon,
          }
        : null,
    [coords, t],
  );

  const handleBack = useCallback(() => {
    navigate(setLocaleSearchParam("/", "", locale));
  }, [navigate, locale]);

  if (status !== "granted" || !airport) {
    return (
      <NearMePermissionPrompt
        status={status}
        errorMessage={errorMessage}
        onRequest={handleRequestLocation}
        onBack={handleBack}
        t={t}
      />
    );
  }

  return (
    <div
      className="app-route-transition min-h-dvh"
      onPointerDown={handleNearMeInteraction}
    >
      <AirportExplorer
        icao=""
        airport={airport}
        mode="nearMe"
        nearMeUserLocation={coords}
        nearMeSidebarLocation={sidebarCoords || coords}
        onBack={handleBack}
        nearMeRefresh={
          useOneShotLocation
            ? { lastTime, refreshing, onRefresh: handleRefresh }
            : undefined
        }
      />
    </div>
  );
}

function NearMePermissionPrompt({
  status,
  errorMessage,
  onRequest,
  onBack,
  t,
}: {
  status: "idle" | "requesting" | "granted" | "denied" | "unavailable";
  errorMessage: string;
  onRequest: () => void;
  onBack: () => void;
  t: (key: string) => string;
}) {
  const busy = status === "requesting";
  const title = busy
    ? t("nearMe.requesting")
    : status === "denied"
      ? t("nearMe.denied")
      : status === "unavailable"
        ? t("nearMe.unsupported")
        : t("nearMe.title");
  const hint = busy
    ? t("nearMe.requestingHint")
    : status === "denied"
      ? t("nearMe.deniedHint")
      : status === "unavailable"
        ? errorMessage || t("nearMe.unsupportedHint")
        : t("nearMe.hint");

  return (
    <div className="min-h-dvh bg-atc-bg text-atc-text">
      <div className="mx-auto flex min-h-dvh max-w-[360px] flex-col items-stretch justify-center gap-3.5 px-6 py-12">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--atc-click-bg)] text-[var(--atc-click-fg)] shadow-[inset_0_-5px_10px_color-mix(in_oklab,var(--atc-click-fg)_8%,transparent)]"
          >
            <LocateFixed className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[18px] font-extrabold leading-tight">
              {title}
            </h1>
            <p className="mt-0.5 text-[11px] leading-snug text-atc-dim">
              {hint}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onRequest}
            disabled={busy}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] bg-[var(--primary-bright)] px-3.5 text-[12px] font-extrabold leading-none text-[var(--primary-ink)] shadow-[0_6px_16px_rgba(14,15,16,0.14)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy
              ? t("nearMe.requestingCta")
              : status === "denied" || status === "unavailable"
                ? t("nearMe.tryAgain")
                : t("nearMe.cta")}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] px-3.5 text-[12px] font-extrabold leading-none text-atc-text shadow-[var(--atc-control-inset-shadow-subtle)] transition hover:bg-[var(--atc-control-hover-bg)] active:scale-[0.98]"
          >
            {t("nearMe.back")}
          </button>
        </div>
      </div>
    </div>
  );
}
