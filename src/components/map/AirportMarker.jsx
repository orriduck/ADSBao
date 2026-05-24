"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import NumberFlow from "@number-flow/react";
import { useMapInstance } from "./MapContext.js";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety.js";
import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";
import { getDistanceNm } from "../../utils/aircraftTrafficIntent.js";
import SocialReactionRing from "../social/SocialReactionRing.jsx";
import { getSocialActivityLevel } from "../../features/social/socialModel.js";

export default function AirportMarker({
  lat,
  lon,
  icao = "",
  airport = null,
  aircraft = [],
  zoom = null,
  groundRadiusNm = 3,
  socialSummary = null,
  onSocialReaction,
}) {
  const map = useMapInstance();
  const markerRef = useRef(null);
  const [container] = useState(() =>
    typeof document !== "undefined" ? document.createElement("div") : null,
  );
  const [ringOpen, setRingOpen] = useState(false);

  // Count aircraft within `groundRadiusNm` of the focal airport, shown
  // as a "NEAR n" line under the badge. Only computed at approach zoom
  // so the badge stays minimal at wider views.
  const showAreaCount = Number(zoom) === ZOOM_APPROACH;
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
        interactive: true,
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
  const runways = airport?.runways;
  if (Array.isArray(runways) && runways.length) {
    details.push({ key: "rwy", label: "RWY", value: runways.length });
  }
  const approachCount = Number(airport?.approachCount);
  if (Number.isFinite(approachCount) && approachCount > 0) {
    details.push({ key: "app", label: "APP", value: approachCount });
  }

  const activityLevel = getSocialActivityLevel(socialSummary);

  return createPortal(
    <div
      className="airport-overlay-label notranslate"
      data-social-activity={activityLevel}
      translate="no"
      onMouseEnter={() => setRingOpen(true)}
      onMouseLeave={() => setRingOpen(false)}
      onClick={(event) => {
        event.stopPropagation();
        setRingOpen((current) => !current);
      }}
    >
      <SocialReactionRing
        open={ringOpen}
        summary={socialSummary}
        onReaction={onSocialReaction}
        className="social-reaction-ring--airport"
      />
      <span className="airport-overlay-label__code endf-tab endf-tab--code">
        <span>{code}</span>
      </span>
      {showAreaCount && (
        <span className="airport-overlay-label__detail">
          NEAR <NumberFlow value={areaCount} />
        </span>
      )}
      {details.map((detail) => (
        <span key={detail.key} className="airport-overlay-label__detail">
          {detail.label} {detail.value}
        </span>
      ))}
    </div>,
    container,
  );
}
