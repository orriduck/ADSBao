"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/platform/router/navigation";
import { LocateFixed } from "lucide-react";
import AirportExplorer from "@/components/airport/explorer/AirportExplorer";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { setLocaleSearchParam } from "@/features/app-shell/i18n/i18nModel";
import { getDistanceNm } from "@/utils/aircraftTrafficIntent";

// Minimum movement (in NM) before the explorer is re-centered. Only
// used by the mobile watchPosition path — desktop uses a one-shot
// getCurrentPosition and a manual refresh button.
const POSITION_REFRESH_THRESHOLD_NM = 0.15;

// Desktop device detection — fine pointer + no touch = laptop/desktop.
function isDesktopDevice() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !("ontouchstart" in window)
  );
}

// `/here` — explorer view centered on the user's current position.
export default function NearMeScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [status, setStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastTime, setLastTime] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const desktopRef = useRef(isDesktopDevice());
  const initialRequestRef = useRef(true);

  // Desktop: one-shot getCurrentPosition + manual refresh.
  // Mobile: continuous watchPosition with movement threshold.
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
      const { latitude, longitude } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setStatus("unavailable");
        setErrorMessage(t("nearMe.unsupported"));
        return;
      }
      setStatus("granted");
      setRefreshing(false);
      if (desktopRef.current) {
        setLastTime(
          new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date()),
        );
      }
      setCoords((previous) => {
        if (!previous) return { lat: latitude, lon: longitude };
        const distance = getDistanceNm(previous.lat, previous.lon, latitude, longitude);
        if (distance != null && distance < POSITION_REFRESH_THRESHOLD_NM) {
          return previous;
        }
        return { lat: latitude, lon: longitude };
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
      maximumAge: desktopRef.current ? 0 : 30_000,
    };

    if (desktopRef.current) {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
    } else {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        options,
      );
    }
  }, [t]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    requestLocation();
    return () => {
      if (watchIdRef.current != null && typeof navigator !== "undefined" && typeof navigator.geolocation?.clearWatch === "function") {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [requestLocation]);

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
    router.push(setLocaleSearchParam("/", "", locale));
  }, [router, locale]);

  if (status !== "granted" || !airport) {
    return (
      <NearMePermissionPrompt
        status={status}
        errorMessage={errorMessage}
        onRequest={requestLocation}
        onBack={handleBack}
        t={t}
      />
    );
  }

  return (
    <div className="app-route-transition min-h-dvh">
      <AirportExplorer
        icao=""
        airport={airport}
        mode="nearMe"
        onBack={handleBack}
        nearMeRefresh={
          desktopRef.current
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
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-stretch justify-center gap-5 px-6 py-12">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--atc-click-bg)] text-[var(--atc-click-fg)] shadow-[inset_0_-8px_14px_color-mix(in_oklab,var(--atc-click-fg)_9%,transparent)]"
          >
            <LocateFixed className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-extrabold leading-tight">
              {title}
            </h1>
            <p className="mt-1 text-[12.5px] leading-snug text-atc-dim">
              {hint}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRequest}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] bg-[var(--primary-bright)] px-4 text-[13px] font-extrabold leading-none text-[var(--primary-ink)] shadow-[var(--atc-action-primary-shadow),0_8px_22px_rgba(14,15,16,0.18)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
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
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] px-4 text-[13px] font-extrabold leading-none text-atc-text shadow-[var(--atc-control-inset-shadow),0_2px_6px_rgba(14,15,16,0.06)] transition hover:bg-[var(--atc-control-hover-bg)] active:scale-[0.98]"
          >
            {t("nearMe.back")}
          </button>
        </div>
      </div>
    </div>
  );
}
