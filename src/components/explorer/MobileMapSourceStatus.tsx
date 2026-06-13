import MapSourceStatusDisplay from "@/components/map/MapSourceStatusDisplay";
import { buildMapSourceStatusDisplay } from "@/features/aviation/sourceDisplayModel";

export default function MobileMapSourceStatus({
  feedSource = "",
  feedStatus = "live",
  lastUpdated = null,
  loadingStatus = "",
  realtimeStatus = "",
  wakeLockActive = false,
}) {
  const status = buildMapSourceStatusDisplay({ feedSource });
  const updatedLabel = formatUpdated(lastUpdated);

  return (
    <MapSourceStatusDisplay
      feedSource={status.feedSource}
      feedStatus={feedStatus}
      updatedLabel={updatedLabel}
      loadingStatus={loadingStatus}
      realtimeStatus={realtimeStatus}
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
