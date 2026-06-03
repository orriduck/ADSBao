"use client";

import { Camera } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  MobilePreviewContent,
  MobilePreviewDetailRow,
  MobilePreviewIdentity,
} from "./MobilePreviewCard";
import {
  formatCandidateWatchingSpotCategory,
  formatCandidateWatchingSpotDistance,
  formatCandidateWatchingSpotName,
} from "./candidateWatchingSpotPreviewFormat";

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
  const disclaimer = String(spot?.disclaimer || t("watcherMode.disclaimer")).trim();
  const attribution = sourceAttribution || t("watcherMode.attribution");

  return (
    <MobilePreviewContent>
      <div className="candidate-watching-spot-preview-motion flex min-w-0 flex-col items-stretch gap-[6px]">
        <MobilePreviewIdentity
          icon={Camera}
          label={t("preview.candidateWatchingSpotPreview")}
          primary={t("preview.candidateWatchingSpotPreview").toUpperCase()}
          secondary={distance || category || null}
        />
        <MobilePreviewDetailRow wrap>
          {name}
        </MobilePreviewDetailRow>
        {category && distance ? (
          <MobilePreviewDetailRow>
            {category}
          </MobilePreviewDetailRow>
        ) : null}
        <MobilePreviewDetailRow wrap>
          {disclaimer}
        </MobilePreviewDetailRow>
        <MobilePreviewDetailRow>
          {attribution}
        </MobilePreviewDetailRow>
      </div>
    </MobilePreviewContent>
  );
}
