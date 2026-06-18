import { useEffect, useRef } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { useMapInstance } from "./MapContext";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety";

function NavaidCountMarker({ count }: { count: number }) {
  return (
    <div
      className="navaid-count-marker navaid-count-marker--enter notranslate"
      translate="no"
    >
      <strong>{count}</strong>
      <span>NAV</span>
    </div>
  );
}

const navaidCountIcon = (count: number, theme: string) =>
  L.divIcon({
    className: `navaid-count-icon navaid-count-icon--${theme}`,
    html: renderToStaticMarkup(<NavaidCountMarker count={count} />),
    iconSize: [54, 30],
    iconAnchor: [27, 15],
  });

export default function NavaidCountLayer({
  counts = [],
  theme = "dark",
  visible = false,
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !visible) return undefined;

    safeRemoveFromMap(layerRef.current, map);
    const markers = counts
      .map((item) => ({
        ...item,
        count: Math.trunc(Number(item?.count)),
        lat: Number(item?.lat),
        lon: Number(item?.lon),
      }))
      .filter(
        (item) =>
          Number.isFinite(item.count) &&
          item.count > 0 &&
          Number.isFinite(item.lat) &&
          Number.isFinite(item.lon),
      );
    if (!markers.length) return undefined;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge);
    const layer = L.layerGroup(
      markers.map((item) =>
        L.marker([item.lat, item.lon], {
          interactive: false,
          autoPanOnFocus: false,
          keyboard: false,
          title: `${item.count} navaids`,
          icon: navaidCountIcon(item.count, theme),
          pane,
        }),
      ),
    );

    const added = safeAddToMap(layer, map, { label: "NavaidCountLayer" });
    if (!added) return undefined;
    layerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      layerRef.current = null;
    };
  }, [counts, map, theme, visible]);

  return null;
}
