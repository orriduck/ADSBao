"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createAircraftPhotoClient } from "../photos/aircraftPhotoClient";

const EMPTY_STATE = Object.freeze({ key: "", photo: null, status: "idle" });
const AIRCRAFT_PHOTO_STALE_TIME_MS = 30 * 60_000;
const aircraftPhotoClient = createAircraftPhotoClient();

type AircraftPhoto = Record<string, unknown>;

type AircraftPhotoState = {
  key: string;
  photo: AircraftPhoto | null;
  status: "idle" | "loading" | "found" | "missing";
};

type AircraftPhotoSubject = {
  icao24?: unknown;
  registration?: unknown;
  type?: unknown;
};

export const aircraftPhotoQueryKeys = {
  all: ["aircraft-photo"] as const,
  detail: (aircraft: AircraftPhotoSubject | null | undefined) =>
    [
      ...aircraftPhotoQueryKeys.all,
      buildPhotoKey(aircraft),
    ] as const,
};

export function buildPhotoKey(aircraft: AircraftPhotoSubject | null | undefined) {
  const hex = String(aircraft?.icao24 || "").trim().toUpperCase();
  if (!hex) return "";
  return [
    hex,
    String(aircraft?.registration || "").trim().toUpperCase(),
    String(aircraft?.type || "").trim().toUpperCase(),
  ].join(":");
}

export function useAircraftPhoto(aircraft: AircraftPhotoSubject | null | undefined) {
  const key = buildPhotoKey(aircraft);
  const query = useQuery({
    queryKey: aircraftPhotoQueryKeys.detail(aircraft),
    queryFn: async ({ queryKey }) => {
      const [, photoKey] = queryKey;
      const [hex, registration, type] = String(photoKey).split(":");
      const payload = await aircraftPhotoClient.fetchAircraftPhoto({
        hex,
        registration,
        type,
      });
      return (payload?.photo as AircraftPhoto | null) || null;
    },
    enabled: Boolean(key),
    staleTime: AIRCRAFT_PHOTO_STALE_TIME_MS,
    gcTime: 2 * AIRCRAFT_PHOTO_STALE_TIME_MS,
    retry: false,
  });

  const photo = query.data || null;
  const state = useMemo<AircraftPhotoState>(
    () =>
      key
        ? {
            key,
            photo,
            status: query.isPending ? "loading" : photo ? "found" : "missing",
          }
        : (EMPTY_STATE as AircraftPhotoState),
    [key, photo, query.isPending],
  );
  return state;
}
