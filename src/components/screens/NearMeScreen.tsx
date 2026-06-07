"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import AirportExplorer from "@/components/airport/explorer/AirportExplorer";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { setLocaleSearchParam } from "@/features/app-shell/i18n/i18nModel";
import { getDistanceNm } from "@/utils/aircraftTrafficIntent";

// Minimum movement (in NM) before the explorer is re-centered on the
// new lat/lon. ~0.15 NM ≈ 280 m is roughly a city block — small
// enough that the page reacts to a walk across town within a minute
// or two, large enough that GPS jitter (typically 5–30 m on phones)
// doesn't trigger a re-fetch on every watchPosition tick.
const POSITION_REFRESH_THRESHOLD_NM = 0.15;

// `/here` — explorer view centered on the user's current position
// instead of an airport. Mirrors the `/airport/[icao]` shell but
// substitutes a synthetic "Your location" profile for the airport
// identity and asks AirportExplorer to run in "nearMe" mode (which
// flips the metric cards to read-only "—" placeholders, swaps the
// weather card to the closest airport METAR, and skips the
// airport-bound fetches).
export default function NearMeScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [status, setStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  // Active geolocation watch id (numeric handle returned by
  // navigator.geolocation.watchPosition). Stored in a ref so re-renders
  // don't restart the watch — we only want to start once on mount and
  // tear it down on unmount.
  const watchIdRef = useRef<number | null>(null);

  // Continuously track the user's position so a real-world move
  // refreshes the explorer without the user touching anything.
  // watchPosition fires every time the OS sees a position change;
  // we apply a movement threshold downstream so we don't thrash
  // re-fetches on GPS jitter (typically 5–30m on phones).
  const requestLocation = useCallback(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation?.watchPosition
    ) {
      setStatus("unavailable");
      setErrorMessage(t("nearMe.unsupported"));
      return;
    }
    // Stop any in-flight watch before starting a new one (the user
    // hit "Try again" after a previous denial, or the component
    // re-ran the effect because of a hot reload).
    if (
      watchIdRef.current != null &&
      typeof navigator.geolocation.clearWatch === "function"
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus("requesting");
    setErrorMessage("");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setStatus("unavailable");
          setErrorMessage(t("nearMe.unsupported"));
          return;
        }
        // Always mark "granted" on a successful tick — the prompt
        // closes as soon as we have any fix.
        setStatus("granted");
        // Only push a coord update when the user has materially
        // moved. The downstream lat/lon-keyed fetches (aircraft
        // polling, reverse geocode, METAR via closest airport,
        // airspace tiles) all re-issue on coord changes, so we
        // gate at this layer.
        setCoords((previous) => {
          if (!previous) return { lat: latitude, lon: longitude };
          const distance = getDistanceNm(
            previous.lat,
            previous.lon,
            latitude,
            longitude,
          );
          if (distance != null && distance < POSITION_REFRESH_THRESHOLD_NM) {
            return previous;
          }
          return { lat: latitude, lon: longitude };
        });
      },
      (error) => {
        if (error?.code === error?.PERMISSION_DENIED) {
          setStatus("denied");
          setErrorMessage(t("nearMe.denied"));
        } else {
          setStatus("unavailable");
          setErrorMessage(error?.message || t("nearMe.unsupported"));
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }, [t]);

  // Start the watch on mount. The browser remembers prior grants on
  // this origin so the second visit doesn't re-prompt. Watch is torn
  // down on unmount so we don't leak listeners or keep the GPS hot
  // when the user navigates away.
  useEffect(() => {
    requestLocation();
    return () => {
      if (
        watchIdRef.current != null &&
        typeof navigator !== "undefined" &&
        typeof navigator.geolocation?.clearWatch === "function"
      ) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [requestLocation]);

  const airport = useMemo(
    () =>
      coords
        ? {
            // Empty ICAO is the signal AirportExplorer / its hooks use
            // to skip airport-only data fetches (METAR by icao,
            // candidate watching spots, ATC frequencies).
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
