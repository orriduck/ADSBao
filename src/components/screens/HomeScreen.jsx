"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import AirportCaptionScreen from "./AirportCaptionScreen";
import SearchScreen from "./SearchScreen";
import { airportDirectoryClient } from "../../features/airport/directory/airportDirectoryClient.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import { setLocaleSearchParam } from "@/features/app-shell/i18n/i18nModel.js";

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

  useEffect(() => {
    if (!currentIcao) {
      setAirport(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resolved = await airportDirectoryClient.resolveAirport(currentIcao, {
          locale,
        });
        if (!cancelled) setAirport(resolved);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load airport", err);
        toast.error(err?.message || "Airport not found or unavailable", {
          id: "airport-resolve",
        });
        setAirport(null);
      }
    })();
    return () => {
      cancelled = true;
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
    return <SearchScreen onOpenAirport={handleOpenAirport} />;
  }

  return (
    <AirportCaptionScreen
      icao={currentIcao}
      airport={airport}
      onBack={handleBack}
    />
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
