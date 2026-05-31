"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NEARBY_AIRPORT_DISCOVERY_CONFIG } from "../../../config/airportDiscovery.js";
import { nearbyAirportClient } from "../nearby/nearbyAirportClient.js";

export function useAirportDiscoveryNearby({
  client = nearbyAirportClient,
  config = NEARBY_AIRPORT_DISCOVERY_CONFIG,
} = {}) {
  const [airports, setAirports] = useState([]);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const requestNearbyAirports = useCallback(() => {
    if (status === "requesting" || status === "loading") return;

    const geolocation = globalThis.navigator?.geolocation;
    if (!geolocation) {
      setStatus("unavailable");
      setErrorMessage("Geolocation is not available in this browser.");
      return;
    }

    setStatus("requesting");
    setErrorMessage("");

    geolocation.getCurrentPosition(
      async (position) => {
        if (!mountedRef.current) return;
        setStatus("loading");

        try {
          const payload = await client.fetchNearbyAirports({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            radiusNm: config.radiusNm,
            limit: config.limit,
          });
          if (!mountedRef.current) return;
          setAirports(payload.airports || []);
          setStatus("resolved");
        } catch (error) {
          if (!mountedRef.current) return;
          console.warn("[airport-discovery-nearby] load failed", error);
          setAirports([]);
          setStatus("unavailable");
          setErrorMessage(error?.message || "Nearby airports are unavailable.");
        }
      },
      () => {
        if (!mountedRef.current) return;
        setAirports([]);
        setStatus("unavailable");
        setErrorMessage("");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
        timeout: 3500,
      },
    );
  }, [client, config.limit, config.radiusNm, status]);

  return {
    airports,
    status,
    errorMessage,
    requestNearbyAirports,
  };
}
