"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import AirportCaptionScreen from "./AirportCaptionScreen";
import SearchScreen from "./SearchScreen";
import { airportDirectoryClient } from "../../features/airport/directory/airportDirectoryClient.js";

export default function HomeScreen({ initialIcao = "" }) {
  const [airport, setAirport] = useState(null);
  const [currentIcao, setCurrentIcao] = useState(initialIcao);

  const loadAirport = async (icao) => {
    if (!icao || icao.length < 3) return;
    try {
      const resolvedAirport = await airportDirectoryClient.resolveAirport(icao);
      setAirport(resolvedAirport);
      setCurrentIcao(String(resolvedAirport?.icao || icao).toUpperCase());
    } catch (err) {
      console.error("Failed to load airport", err);
      toast.error(err?.message || "Airport not found or unavailable", {
        id: "airport-resolve",
      });
      setAirport(null);
    }
  };

  useEffect(() => {
    if (initialIcao) {
      loadAirport(initialIcao);
    } else {
      // initialIcao went from a value to empty — happens when the user
      // navigates back to "/" via a Next Link (e.g. the sidebar logo).
      // The HomeScreen instance is reused across both routes, so without
      // this reset the screen would keep rendering the previous airport's
      // detail view while the URL has already gone home.
      setAirport(null);
      setCurrentIcao("");
    }
  }, [initialIcao]);

  useEffect(() => {
    const handlePopState = () => {
      const pathIcao = normalizePathIcao(window.location.pathname);
      if (!pathIcao) {
        setAirport(null);
        setCurrentIcao("");
        return;
      }
      setCurrentIcao(pathIcao);
      loadAirport(pathIcao);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleOpenAirport = async (selectedAirport) => {
    const nextIcao = String(
      selectedAirport.icao || selectedAirport.code || "",
    ).toUpperCase();
    if (!nextIcao) return;
    setAirport(selectedAirport);
    setCurrentIcao(nextIcao);
    window.history.pushState({ icao: nextIcao }, "", `/airport/${nextIcao}`);
  };

  const handleBack = () => {
    setAirport(null);
    setCurrentIcao("");
    window.history.pushState({}, "", "/");
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
