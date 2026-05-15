"use client";

import { useEffect, useState } from "react";
import { aircraftTraceClient } from "../services/aviationData.js";
import {
  mergeTraceHistory,
  normalizeAdsbTracePayload,
} from "../features/aircraft-trace/aircraftTraceModel.js";

function liveAircraftToTracePoint(aircraft) {
  if (!aircraft) return null;
  const lat = Number(aircraft.lat);
  const lon = Number(aircraft.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const positionTime = Number(aircraft.positionTime);
  const altitude = Number(aircraft.altitude);
  const velocity = Number(aircraft.velocity);
  const track = Number(aircraft.track);
  const baroRate = Number(aircraft.baroRate);

  return {
    timestampMs: Number.isFinite(positionTime) ? positionTime : Date.now(),
    lat,
    lon,
    altitude: Number.isFinite(altitude) ? altitude : null,
    onGround: Boolean(aircraft.onGround),
    velocity: Number.isFinite(velocity) ? velocity : null,
    track: Number.isFinite(track) ? track : null,
    baroRate: Number.isFinite(baroRate) ? baroRate : null,
  };
}

export function useAircraftTrace(selectedAircraft = null) {
  const hex = selectedAircraft?.icao24 || "";
  const [tracePoints, setTracePoints] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch the recent trace once when the selection changes. Merge into
  // whatever live points have already accumulated so we don't trample
  // positions that polled in between selection and fetch resolution.
  useEffect(() => {
    if (!hex) {
      setTracePoints([]);
      setLoading(false);
      return undefined;
    }

    let disposed = false;
    setTracePoints([]);
    setLoading(true);

    aircraftTraceClient
      .fetchAircraftTrace({ hex })
      .then((payload) => {
        if (disposed) return;
        const recent = normalizeAdsbTracePayload(payload?.recent);
        setTracePoints((current) =>
          mergeTraceHistory({
            recentTrace: recent,
            fallbackHistory: current,
          }),
        );
      })
      .catch((error) => {
        if (!disposed) {
          console.warn(`[aircraft-trace:${hex}] trace fetch failed`, error);
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [hex]);

  // Append the latest polled position to the trace so the trail extends
  // forward in real time. mergeTraceHistory dedupes by (timestamp, lat, lon),
  // so repeated polls with the same data don't grow the array.
  useEffect(() => {
    if (!hex) return;
    const point = liveAircraftToTracePoint(selectedAircraft);
    if (!point) return;
    setTracePoints((current) =>
      mergeTraceHistory({
        recentTrace: [point],
        fallbackHistory: current,
      }),
    );
  }, [hex, selectedAircraft]);

  return {
    tracePoints,
    loading,
  };
}
