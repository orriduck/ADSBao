"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety";
import { shouldShowAirportAreaCountForZoom } from "../../features/airport/map/airportMapZoomFeatures";
import { getDistanceNm } from "../../utils/aircraftTrafficIntent";
import { AirportLabelBadge } from "@/components/ui/AirportLabelBadge";

export default function AirportMarker({
  lat,
  lon,
  icao = "",
  airport = null,
  aircraft = [],
  zoom = null,
  groundRadiusNm = 3,
}) {
  const map = useMapInstance();
  const markerRef = useRef(null);
  const [container] = useState(() =>
    typeof document !== "undefined" ? document.createElement("div") : null,
  );

  // Count aircraft within `groundRadiusNm` of the focal airport when
  // zoom-feature config enables the "NEAR n" badge detail.
  const showAreaCount = shouldShowAirportAreaCountForZoom(zoom);
  const areaCount = useMemo(() => {
    if (!showAreaCount || !lat || !lon) return 0;
    return aircraft.filter((item) => {
      const distNm = getDistanceNm(lat, lon, item.lat, item.lon);
      return distNm != null && distNm <= groundRadiusNm;
    }).length;
  }, [aircraft, showAreaCount, lat, lon, groundRadiusNm]);

  useEffect(() => {
    if (!map || !map.getContainer || !lat || !lon || !container)
      return undefined;
    const marker = safeAddToMap(
      L.marker([lat, lon], {
        interactive: false,
        icon: L.divIcon({
          className: "",
          html: container,
          iconSize: [120, 34],
          iconAnchor: [0, -8],
        }),
      }),
      map,
      { label: "AirportMarker" },
    );
    if (!marker) return undefined;
    markerRef.current = marker;
    return () => {
      safeRemoveFromMap(marker, map);
      markerRef.current = null;
    };
  }, [map, lat, lon, container]);

  if (!container) return null;

  const code = (airport?.iata || icao || "").trim();
  const details = [];
  if (showAreaCount) {
    details.push({ key: "near", variant: "near", label: "NEAR", value: areaCount });
  }
  const approachCount = Number(airport?.approachCount);
  if (Number.isFinite(approachCount) && approachCount > 0) {
    details.push({ key: "app", label: "APP", value: approachCount });
  }

  return createPortal(
    <AirportLabelBadge code={code} details={details} />,
    container,
  );
}
