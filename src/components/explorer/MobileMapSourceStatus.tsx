import MapSourceStatusDisplay from "@/components/map/MapSourceStatusDisplay";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { buildMapSourceStatusDisplay } from "@/features/aviation/sourceDisplayModel";

export default function MobileMapSourceStatus({
  feedSource = "",
  feedStatus = "live",
  lastUpdated = null,
  loadingStatus = "",
  realtimeStatus = "",
  statusLines = [],
  wakeLockActive = false,
}) {
  const { t } = useI18n();
  const status = buildMapSourceStatusDisplay({
    feedSource,
    feedStatus,
    cachedLabel: t("app.feedCached"),
  });
  const updatedLabel = formatUpdated(lastUpdated);

  return (
    <MapSourceStatusDisplay
      feedSource={status.feedSource}
      feedStatus={feedStatus}
      cachedLabel={status.cachedLabel}
      updatedLabel={updatedLabel}
      loadingStatus={loadingStatus}
      realtimeStatus={realtimeStatus}
      statusLines={statusLines}
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
