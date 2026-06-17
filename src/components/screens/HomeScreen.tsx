"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "@/platform/router/navigation";
import { toast } from "sonner";
import AirportExplorer from "@/components/airport/explorer/AirportExplorer";
import AirportSearchPanel from "@/components/airport/search/AirportSearchPanel";
import { airportDirectoryClient } from "../../features/airport/directory/airportDirectoryClient";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { setLocaleSearchParam } from "@/features/app-shell/i18n/i18nModel";

// Single client component shared between "/" and "/airport/[icao]" —
// pathname drives which sub-screen renders, so back/forward, the
// sidebar logo Link, and any other Next router navigation all stay in
// sync without manual history.pushState or popstate plumbing.
export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useI18n();
  const currentIcao = normalizePathIcao(pathname);
  const [airport, setAirport] = useState(null);
  const [routeTransitionActive, setRouteTransitionActive] = useState(true);
  const hasPlayedInitialRouteTransitionRef = useRef(false);

  useEffect(() => {
    if (!currentIcao) return undefined;
    if (!hasPlayedInitialRouteTransitionRef.current) {
      hasPlayedInitialRouteTransitionRef.current = true;
      setRouteTransitionActive(true);
      return undefined;
    }
    setRouteTransitionActive(false);
    const frameId = window.requestAnimationFrame(() => {
      setRouteTransitionActive(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [currentIcao]);

  useEffect(() => {
    if (!currentIcao) {
      setAirport(null);
      return;
    }
    setAirport((current) =>
      airportCode(current) === currentIcao ? current : null,
    );
    let cancelled = false;
    let pageLeaving = false;
    const deferredController = new AbortController();
    const handlePageHide = () => {
      pageLeaving = true;
    };
    window.addEventListener("pagehide", handlePageHide);
    (async () => {
      try {
        const resolved = await airportDirectoryClient.resolveAirport(currentIcao, {
          locale,
        });
        if (cancelled) return;
        setAirport(resolved);
        airportDirectoryClient
          .resolveAirportContext(currentIcao, {
            signal: deferredController.signal,
          })
          .then((context) => {
            if (cancelled || !context) return;
            setAirport((current) => {
              if (airportCode(current) !== currentIcao) return current;
              return { ...current, ...context };
            });
          })
          .catch((contextError) => {
            if (!cancelled && !isInterruptedFetch(contextError)) {
              console.warn("Failed to load airport context", contextError);
            }
          });
        airportDirectoryClient
          .resolveAirportSurface(currentIcao, {
            signal: deferredController.signal,
          })
          .then((surfaceMap) => {
            if (cancelled || !surfaceMap) return;
            setAirport((current) => {
              if (airportCode(current) !== currentIcao) return current;
              return { ...current, surfaceMap };
            });
          })
          .catch((surfaceError) => {
            if (
              !cancelled &&
              !pageLeaving &&
              !isInterruptedFetch(surfaceError)
            ) {
              console.warn("Failed to load airport surface", surfaceError);
            }
          });
      } catch (err) {
        if (
          cancelled ||
          pageLeaving ||
          isInterruptedNavigationFetch(err, currentIcao)
        ) {
          return;
        }
        console.error("Failed to load airport", err);
        toast.error(err?.message || "Airport not found or unavailable", {
          id: "airport-resolve",
        });
        setAirport(null);
      }
    })();
    return () => {
      cancelled = true;
      deferredController.abort();
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [currentIcao, locale]);

  const handleOpenAirport = (selectedAirport) => {
    const nextIcao = String(
      selectedAirport.icao || selectedAirport.code || "",
    ).toUpperCase();
    if (!nextIcao) return;
    // Optimistically seed the airport data so the detail view renders
    // without a flash while the resolveAirport effect re-fires off the
    // new pathname.
    setAirport(selectedAirport);
    router.push(setLocaleSearchParam(`/airport/${nextIcao}`, "", locale));
  };

  const handleBack = () => {
    router.push(setLocaleSearchParam("/", "", locale));
  };

  if (!currentIcao) {
    return <AirportSearchPanel onOpenAirport={handleOpenAirport} />;
  }

  return (
    <div
      className={`${routeTransitionActive ? "app-route-transition " : ""}min-h-dvh`}
    >
      <AirportExplorer
        icao={currentIcao}
        airport={airportCode(airport) === currentIcao ? airport : null}
        onBack={handleBack}
      />
    </div>
  );
}

function normalizePathIcao(pathname) {
  // Airport pages live under /airport/[icao]; pull the segment that follows
  // /airport/ rather than the first path segment.
  const segments = String(pathname || "")
    .split("/")
    .filter(Boolean);
  const airportIndex = segments.indexOf("airport");
  const candidate = airportIndex >= 0 ? segments[airportIndex + 1] : "";
  const normalized = String(candidate || "").trim().toUpperCase();
  return /^[A-Z0-9]{3,4}$/.test(normalized) ? normalized : "";
}

function airportCode(airport) {
  return String(airport?.icao || airport?.code || airport?.ident || "")
    .trim()
    .toUpperCase();
}

function isInterruptedNavigationFetch(error, expectedIcao) {
  if (!isInterruptedFetch(error)) return false;
  if (typeof window === "undefined") return false;
  return normalizePathIcao(window.location.pathname) !== expectedIcao;
}

function isInterruptedFetch(error) {
  const message = String(error?.message || error || "");
  return /Failed to fetch|AbortError|aborted/i.test(message);
}
