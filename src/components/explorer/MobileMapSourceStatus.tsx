import MapSourceStatusDisplay from "@/components/map/MapSourceStatusDisplay";
import {
  ROUTE_PROVIDER,
  buildMapSourceStatusDisplay,
} from "@/features/aviation/sourceDisplayModel";

export default function MobileMapSourceStatus({
  feedSource = "",
  feedStatus = "live",
  lastUpdated = null,
  routeProvider = ROUTE_PROVIDER.ADSBDB,
  loadingStatus = "",
  wakeLockActive = false,
}) {
  const status = buildMapSourceStatusDisplay({ feedSource, routeProvider });
  const updatedLabel = formatUpdated(lastUpdated);

  return (
    <MapSourceStatusDisplay
      feedSource={status.feedSource}
      feedStatus={feedStatus}
      updatedLabel={updatedLabel}
      routeProviderLabel={status.routeProvider}
      loadingStatus={loadingStatus}
      placement="map-corner"
      wakeLockActive={wakeLockActive}
    />
  );
}

function formatUpdated(date) {
  if (!date) return "";
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
