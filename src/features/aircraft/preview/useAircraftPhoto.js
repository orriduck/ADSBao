"use client";

import { useEffect, useState } from "react";
import { aircraftPhotoClient } from "../../aviation/aviationData.js";

const EMPTY_STATE = Object.freeze({ key: "", photo: null, status: "idle" });

function buildPhotoKey(aircraft) {
  const hex = String(aircraft?.icao24 || "").trim().toUpperCase();
  if (!hex) return "";
  return [
    hex,
    String(aircraft?.registration || "").trim().toUpperCase(),
    String(aircraft?.type || "").trim().toUpperCase(),
  ].join(":");
}

export function useAircraftPhoto(aircraft) {
  const key = buildPhotoKey(aircraft);
  const [state, setState] = useState(EMPTY_STATE);

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
          const photo = payload?.photo || null;
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
