import { useEffect } from "react";
import maplibregl from "maplibre-gl";

export default function NativeMapMarkers({
  map,
  active,
  airportCode = "",
  lat = null,
  lon = null,
}: Record<string, any>) {
  useEffect(() => {
    const markerLat = Number(lat);
    const markerLon = Number(lon);
    const code = String(airportCode || "").trim().toUpperCase();
    if (
      !map ||
      !active ||
      !code ||
      !Number.isFinite(markerLat) ||
      !Number.isFinite(markerLon)
    ) {
      return undefined;
    }

    const element = document.createElement("div");
    element.className = "native-map-airport-marker";
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", `${code} airport`);

    const signal = document.createElement("span");
    signal.className = "native-map-airport-marker__signal";
    signal.setAttribute("aria-hidden", "true");
    signal.textContent = "⌖";

    const label = document.createElement("span");
    label.className = "native-map-airport-marker__label";
    label.textContent = code;

    element.append(signal, label);
    const marker = new maplibregl.Marker({
      element,
      anchor: "bottom-left",
      offset: [0, -7],
      rotationAlignment: "viewport",
      pitchAlignment: "viewport",
    })
      .setLngLat([markerLon, markerLat])
      .addTo(map);

    return () => {
      marker.remove();
    };
  }, [active, airportCode, lat, lon, map]);

  return null;
}
