"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AIRPORT_SEARCH_CONFIG,
  FEATURED_AIRPORTS,
} from "../../../config/airportSearch.js";
import { airportDirectoryClient } from "../directory/airportDirectoryClient.js";
import {
  getFeaturedAirportDisplayItems,
  getAirportResultCountLabel,
  mergeAirportSearchRows,
  orderFeaturedAirportsByNearest,
} from "./airportSearchModel.js";

export function useAirportSearch({
  directoryClient = airportDirectoryClient,
  featuredAirports = FEATURED_AIRPORTS,
  config = AIRPORT_SEARCH_CONFIG,
} = {}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const activeRequestId = useRef(0);

  const orderedFeaturedAirports = useMemo(
    () =>
      orderFeaturedAirportsByNearest({
        featuredAirports,
        location: userLocation,
      }),
    [featuredAirports, userLocation],
  );

  const rows = useMemo(
    () =>
      mergeAirportSearchRows({
        query,
        featuredAirports: orderedFeaturedAirports,
        results,
      }),
    [orderedFeaturedAirports, query, results],
  );

  const countLabel = getAirportResultCountLabel({
    loading,
    rowCount: rows.length,
  });

  const featuredAirportItems = useMemo(
    () =>
      getFeaturedAirportDisplayItems({
        featuredAirports: orderedFeaturedAirports,
        locationStatus,
      }),
    [locationStatus, orderedFeaturedAirports],
  );

  useEffect(() => {
    const timer = setTimeout(
      async () => {
        const trimmed = query.trim();
        const requestId = ++activeRequestId.current;
        if (!trimmed) {
          setResults([]);
          setLoading(false);
          setError(null);
          return;
        }

        setLoading(true);
        setError(null);
        try {
          const payload = await directoryClient.loadAirports({
            query: trimmed,
            country: config.country,
            kind: config.kind,
            limit: config.limit,
          });
          if (requestId !== activeRequestId.current) return;
          setResults(payload.airports || []);
        } catch (err) {
          if (requestId !== activeRequestId.current) return;
          console.error("Airport search failed", err);
          setResults([]);
          setError(err?.message || "Airport directory is unavailable right now");
        } finally {
          if (requestId === activeRequestId.current) setLoading(false);
        }
      },
      query.trim() ? config.debounceMs : 0,
    );

    return () => clearTimeout(timer);
  }, [config, directoryClient, query]);

  const requestNearestAirport = useCallback(() => {
    if (!globalThis.navigator?.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("requesting");
    globalThis.navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLocationStatus("resolved");
      },
      () => {
        setLocationStatus("unavailable");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
        timeout: 2500,
      },
    );
  }, []);

  return {
    query,
    setQuery,
    rows,
    featuredAirports: orderedFeaturedAirports,
    featuredAirportItems,
    locationStatus,
    requestNearestAirport,
    loading,
    error,
    countLabel,
  };
}
