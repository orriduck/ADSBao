import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  formatCandidateWatchingSpotCategory,
  formatCandidateWatchingSpotDistance,
  formatCandidateWatchingSpotName,
} from "./candidateWatchingSpotPreviewFormat";
import { MobilePreviewHeader, MobilePreviewMetaLine } from "./previewCardChrome";

type CandidateWatchingSpotPreviewMobileCardProps = {
  spot?: Record<string, any> | null;
  sourceAttribution?: string;
};

export default function CandidateWatchingSpotPreviewMobileCard({
  spot,
  sourceAttribution = "",
}: CandidateWatchingSpotPreviewMobileCardProps) {
  const { t } = useI18n();
  const name = formatCandidateWatchingSpotName(
    spot,
    t("watcherMode.fallbackName"),
  );
  const category = formatCandidateWatchingSpotCategory(spot);
  const distance = formatCandidateWatchingSpotDistance(spot, t);
  const attribution = String(sourceAttribution || "").trim();

  const items = [
    distance ? <span key="distance">{distance}</span> : null,
    attribution ? (
      <span key="attribution" className="text-atc-faint">
        {attribution}
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <div className="candidate-watching-spot-preview-motion flex flex-col gap-[7px] px-[12px] pb-[6px] pt-[10px] [[data-density=compact]_&]:px-[10px]">
      <MobilePreviewHeader
        primary={name}
        primaryMono={false}
        secondary={category || undefined}
      />
      <MobilePreviewMetaLine items={items} />
    </div>
  );
}
