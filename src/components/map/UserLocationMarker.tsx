"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import {
  resolveUserLocationPulseDiameterPx,
  USER_LOCATION_PULSE_RADIUS_METERS,
} from "@/features/airport/map/userLocationModel";

const METERS_PER_LATITUDE_DEGREE = 111_320;
const USER_LOCATION_ICON_SIZE_PX = 18;

export default function UserLocationMarker({
  location = null,
  pulseIntervalMs = null,
  pulseBeat = null,
}: Record<string, any>) {
  const map = useMapInstance();
  const markerRef = useRef(null);
  const locationLat = location?.lat;
  const locationLon = location?.lon;
  const [pulseDiameterPx, setPulseDiameterPx] = useState(18);
  const [container] = useState(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.style.cssText = "position:relative;width:18px;height:18px";
    return el;
  });

  useEffect(() => {
    if (!map || !container || locationLat == null || locationLon == null) {
      return undefined;
    }

    const marker = L.marker([locationLat, locationLon], {
      interactive: false,
      keyboard: false,
      zIndexOffset: 900,
      icon: L.divIcon({
        className: "user-location-leaflet-icon",
        html: container,
        iconSize: [USER_LOCATION_ICON_SIZE_PX, USER_LOCATION_ICON_SIZE_PX],
        iconAnchor: [
          USER_LOCATION_ICON_SIZE_PX / 2,
          USER_LOCATION_ICON_SIZE_PX / 2,
        ],
      }),
    }).addTo(map);
    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, container, locationLat, locationLon]);

  useEffect(() => {
    if (!map || locationLat == null || locationLon == null) return undefined;

    const syncPulseDiameter = () => {
      const centerPoint = map.latLngToLayerPoint([locationLat, locationLon]);
      const radiusLat =
        locationLat +
        USER_LOCATION_PULSE_RADIUS_METERS / METERS_PER_LATITUDE_DEGREE;
      const radiusPoint = map.latLngToLayerPoint([radiusLat, locationLon]);
      setPulseDiameterPx(
        resolveUserLocationPulseDiameterPx({ centerPoint, radiusPoint }),
      );
    };

    syncPulseDiameter();
    map.on("zoomend moveend resize", syncPulseDiameter);
    return () => {
      map.off("zoomend moveend resize", syncPulseDiameter);
    };
  }, [map, locationLat, locationLon]);

  if (!container || !location) return null;

  return createPortal(
    <div className="user-location-marker" aria-label="Current location">
      <span
        key={pulseBeat || "idle"}
        className="user-location-marker__pulse"
        aria-hidden="true"
        style={
          {
            "--user-location-pulse-diameter": `${pulseDiameterPx}px`,
            "--user-location-pulse-duration":
              pulseIntervalMs && Number.isFinite(Number(pulseIntervalMs))
                ? `${Math.max(180, Number(pulseIntervalMs))}ms`
                : undefined,
          } as CSSProperties
        }
      />
      <span className="user-location-marker__diamond" aria-hidden="true" />
    </div>,
    container,
  );
}
