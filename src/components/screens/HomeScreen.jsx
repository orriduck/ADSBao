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
    let toastId = null;
    const delayTimer = setTimeout(() => {
      toastId = toast.loading("Loading airport context...", {
        id: "airport-resolve",
      });
    }, 500);
    try {
      const resolvedAirport = await airportDirectoryClient.resolveAirport(icao);
      clearTimeout(delayTimer);
      if (toastId) toast.dismiss(toastId);
      setAirport(resolvedAirport);
      setCurrentIcao(String(resolvedAirport?.icao || icao).toUpperCase());
    } catch (err) {
      clearTimeout(delayTimer);
      console.error("Failed to load airport", err);
      toast.error(err?.message || "Airport not found or unavailable", {
        id: toastId ?? "airport-resolve",
      });
      setAirport(null);
    }
  };

  useEffect(() => {
    if (initialIcao) loadAirport(initialIcao);
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
