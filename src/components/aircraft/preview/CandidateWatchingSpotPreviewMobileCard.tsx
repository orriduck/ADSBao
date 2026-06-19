import { Camera } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  MobilePreviewContent,
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
  const attribution = String(sourceAttribution || "").trim();
  const summaryLabel = distance || category || null;

  return (
    <MobilePreviewContent>
      <div className="candidate-watching-spot-preview-motion flex min-w-0 flex-col items-stretch gap-[6px]">
        <MobilePreviewIdentity
          icon={Camera}
          label={t("preview.candidateWatchingSpotPreview")}
          primary={name}
          primaryClassName="whitespace-normal break-words text-[18px] leading-[1.05]"
          secondary={null}
        />
        <div className="flex min-w-0 items-baseline justify-between gap-3 font-[var(--font-mono)]">
          <span
            translate="no"
            className="notranslate min-w-0 shrink-0 truncate whitespace-nowrap text-left text-[10px] font-semibold leading-tight tracking-normal text-atc-dim"
          >
            {summaryLabel}
          </span>
          {attribution ? (
            <span className="min-w-0 truncate whitespace-nowrap text-right text-[10px] font-medium leading-tight tracking-normal text-atc-dim">
              {attribution}
            </span>
          ) : null}
        </div>
      </div>
    </MobilePreviewContent>
  );
}
