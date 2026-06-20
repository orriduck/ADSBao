import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { useMapInstance } from "./MapContext";

const USER_LOCATION_ICON_SIZE_PX = 18;

export default function UserLocationMarker({
  location = null,
}: Record<string, any>) {
  const map = useMapInstance();
  const markerRef = useRef(null);
  const locationLat = location?.lat;
  const locationLon = location?.lon;
  const headingDeg = useMemo(() => {
    const numeric = Number(location?.headingDeg);
    if (!Number.isFinite(numeric) || numeric < 0) return null;
    return ((numeric % 360) + 360) % 360;
  }, [location?.headingDeg]);
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
      autoPanOnFocus: false,
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

  if (!container || !location) return null;

  return createPortal(
    <div className="user-location-marker" aria-label="Current location">
      {headingDeg == null ? null : (
        <span
          className="user-location-marker__heading-beam"
          aria-hidden="true"
          style={
            {
              "--user-location-heading": `${headingDeg}deg`,
            } as CSSProperties
          }
        />
      )}
      <span className="user-location-marker__diamond" aria-hidden="true" />
    </div>,
    container,
  );
}
