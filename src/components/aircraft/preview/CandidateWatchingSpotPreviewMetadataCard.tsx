import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { Binoculars } from "lucide-react";
import {
  formatCandidateWatchingSpotCategory,
  formatCandidateWatchingSpotDistance,
  formatCandidateWatchingSpotName,
} from "./candidateWatchingSpotPreviewFormat";
import {
  PreviewCardHeader,
  PreviewMetaRows,
  PreviewWayfindingRail,
} from "./previewCardChrome";

type CandidateWatchingSpotPreviewMetadataCardProps = {
  spot?: Record<string, any> | null;
  sourceAttribution?: string;
  onOpenNavigation?: () => void;
};

export default function CandidateWatchingSpotPreviewMetadataCard({
  spot,
  sourceAttribution = "",
  onOpenNavigation,
}: CandidateWatchingSpotPreviewMetadataCardProps) {
  const { t } = useI18n();
  const name = formatCandidateWatchingSpotName(
    spot,
    t("watcherMode.fallbackName"),
  );
  const category = formatCandidateWatchingSpotCategory(spot);
  const distance = formatCandidateWatchingSpotDistance(spot, t);
  const disclaimer = String(spot?.disclaimer || t("watcherMode.disclaimer")).trim();
  const sourceLabel = String(spot?.sourceLabel || spot?.source || "").trim();
  const attribution = String(sourceAttribution || "").trim();
  const rows = [
    { label: t("metrics.distance"), value: distance },
    { label: t("preview.airspaceSource"), value: sourceLabel },
  ].filter((row) => row.value);

  return (
    <div className="aircraft-preview-metadata-card aircraft-preview-metadata-card--sign">
      <div className="candidate-watching-spot-preview-motion">
        <div className="aircraft-preview-identity-band">
          <PreviewWayfindingRail icon={<Binoculars />} tone="secondary" />
          <div className="aircraft-preview-identity-content">
            <PreviewCardHeader
              primary={name}
              primaryMono={false}
              secondary={category || undefined}
            />
          </div>
        </div>
        <div className="aircraft-preview-detail-band">
          <PreviewMetaRows rows={rows} />
          <p className="mt-2.5 text-[11px] leading-snug text-atc-dim">{disclaimer}</p>
          {attribution ? (
            <p className="mt-2 text-[9px] leading-tight text-atc-faint">
              {attribution}
            </p>
          ) : null}
        </div>
        {typeof onOpenNavigation === "function" ? (
          <div className="aircraft-preview-card__actions">
            <button
              type="button"
              className="aircraft-preview-card__track-btn"
              onClick={onOpenNavigation}
              aria-label={`${t("preview.goToSpot")} ${name}`}
            >
              {t("preview.goToSpot")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
