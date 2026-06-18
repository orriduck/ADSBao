import { lazy, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AirportSearchPanel from "@/components/airport/search/AirportSearchPanel";
import {
  airportProfileCode,
  prefetchAirportProfile,
  useAirportProfileQueries,
} from "@/features/airport/directory/airportProfileQueries";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { setLocaleSearchParam } from "@/features/app-shell/i18n/i18nModel";

const AirportExplorer = lazy(() => import("@/components/airport/explorer/AirportExplorer"));

// Single client component shared between "/" and "/airport/[icao]" —
// pathname drives which sub-screen renders, so back/forward, the
// sidebar logo Link, and any other React Router navigation all stay in
// sync without manual history.pushState or popstate plumbing.
export default function HomeScreen() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { locale } = useI18n();
  const currentIcao = normalizePathIcao(pathname);
  const seedAirportRef = useRef(null);
  const pageLeavingRef = useRef(false);
  const routeTransitionActive = useRouteTransition(currentIcao);
  const seededAirport = useMemo(
    () =>
      airportProfileCode(seedAirportRef.current) === currentIcao
        ? seedAirportRef.current
        : null,
    [currentIcao],
  );
  const {
    airport,
    detailQuery,
    contextQuery,
    surfaceQuery,
    surfaceStructuresQuery,
    queryClient,
  } = useAirportProfileQueries({
    icao: currentIcao,
    locale,
    seedAirport: seededAirport,
  });

  useEffect(() => {
    const handlePageHide = () => {
      pageLeavingRef.current = true;
    };
    const handlePageShow = () => {
      pageLeavingRef.current = false;
    };
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    if (!currentIcao) seedAirportRef.current = null;
  }, [currentIcao]);

  useEffect(() => {
    if (!currentIcao || !detailQuery.error) return;
    if (pageLeavingRef.current) return;
    if (isInterruptedNavigationFetch(detailQuery.error, currentIcao)) return;
    console.error("Failed to load airport", detailQuery.error);
    toast.error(
      detailQuery.error?.message || "Airport not found or unavailable",
      { id: "airport-resolve" },
    );
  }, [currentIcao, detailQuery.error]);

  useEffect(() => {
    if (!contextQuery.error || isInterruptedFetch(contextQuery.error)) return;
    if (pageLeavingRef.current) return;
    console.warn("Failed to load airport context", contextQuery.error);
  }, [contextQuery.error]);

  useEffect(() => {
    if (!surfaceQuery.error || isInterruptedFetch(surfaceQuery.error)) return;
    if (pageLeavingRef.current) return;
    console.warn("Failed to load airport surface", surfaceQuery.error);
  }, [surfaceQuery.error]);

  useEffect(() => {
    if (
      !surfaceStructuresQuery.error ||
      isInterruptedFetch(surfaceStructuresQuery.error)
    ) {
      return;
    }
    if (pageLeavingRef.current) return;
    console.warn(
      "Failed to load airport surface structures",
      surfaceStructuresQuery.error,
    );
  }, [surfaceStructuresQuery.error]);

  const handleOpenAirport = (selectedAirport) => {
    const nextIcao = String(
      selectedAirport.icao || selectedAirport.code || "",
    ).toUpperCase();
    if (!nextIcao) return;
    // Optimistically seed the airport data so the detail view renders
    // without a flash while the resolveAirport effect re-fires off the
    // new pathname.
    seedAirportRef.current = selectedAirport;
    navigate(setLocaleSearchParam(`/airport/${nextIcao}`, "", locale));
  };

  const handlePrefetchAirport = (selectedAirport) => {
    const nextIcao = String(
      selectedAirport?.icao || selectedAirport?.code || "",
    ).toUpperCase();
    if (!nextIcao) return;
    prefetchAirportProfile(queryClient, { icao: nextIcao, locale });
  };

  const handleBack = () => {
    navigate(setLocaleSearchParam("/", "", locale));
  };

  if (!currentIcao) {
    return (
      <AirportSearchPanel
        onOpenAirport={handleOpenAirport}
        onPrefetchAirport={handlePrefetchAirport}
      />
    );
  }

  return (
    <div
      className={`${routeTransitionActive ? "app-route-transition " : ""}min-h-dvh`}
    >
      <AirportExplorer
        icao={currentIcao}
        airport={airport}
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

function useRouteTransition(currentIcao) {
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

  return routeTransitionActive;
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
