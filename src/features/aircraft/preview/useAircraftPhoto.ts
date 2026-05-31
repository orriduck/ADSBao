"use client";

import { useEffect, useState } from "react";
import { aircraftPhotoClient } from "../../aviation/aviationData";

const EMPTY_STATE = Object.freeze({ key: "", photo: null, status: "idle" });

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

function buildPhotoKey(aircraft: AircraftPhotoSubject | null | undefined) {
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
  const [state, setState] = useState<AircraftPhotoState>(EMPTY_STATE as AircraftPhotoState);

  useEffect(() => {
    if (!key) {
      setState(EMPTY_STATE);
      return undefined;
    }

    let cancelled = false;
    const [hex, registration, type] = key.split(":");
    setState({ key, photo: null, status: "loading" });

    aircraftPhotoClient
      .fetchAircraftPhoto({ hex, registration, type })
      .then((payload) => {
        if (!cancelled) {
          const photo = payload?.photo as AircraftPhoto | null || null;
          setState({ key, photo, status: photo ? "found" : "missing" });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ key, photo: null, status: "missing" });
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return state.key === key ? state : { key, photo: null, status: "loading" };
}
