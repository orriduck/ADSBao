import { useI18n } from "@/features/app-shell/i18n/useI18n";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import {
  formatCandidateWatchingSpotCategory,
  formatCandidateWatchingSpotDistance,
  formatCandidateWatchingSpotName,
} from "./candidateWatchingSpotPreviewFormat";
import {
  MobilePreviewHeader,
  MobilePreviewIdentityBand,
  MobilePreviewMetaLine,
} from "./previewCardChrome";
import { Binoculars } from "lucide-react";

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
    distance ? <AnimatedNumber key="distance" value={distance} /> : null,
    attribution ? (
      <span key="attribution" className="text-atc-faint">
        {attribution}
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <div className="candidate-watching-spot-preview-motion mobile-preview-sign">
      <MobilePreviewIdentityBand icon={<Binoculars />}>
        <MobilePreviewHeader
          primary={name}
          primaryMono={false}
          secondary={category || undefined}
        />
      </MobilePreviewIdentityBand>
      <MobilePreviewMetaLine items={items} />
    </div>
  );
}
