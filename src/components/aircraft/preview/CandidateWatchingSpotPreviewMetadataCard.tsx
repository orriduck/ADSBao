"use client";

import { Camera } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  formatCandidateWatchingSpotCategory,
  formatCandidateWatchingSpotDistance,
  formatCandidateWatchingSpotName,
} from "./candidateWatchingSpotPreviewFormat";

type CandidateWatchingSpotPreviewMetadataCardProps = {
  spot?: Record<string, any> | null;
  sourceAttribution?: string;
};

export default function CandidateWatchingSpotPreviewMetadataCard({
  spot,
  sourceAttribution = "",
}: CandidateWatchingSpotPreviewMetadataCardProps) {
  const { t } = useI18n();
  const name = formatCandidateWatchingSpotName(
    spot,
    t("watcherMode.fallbackName"),
  );
  const category = formatCandidateWatchingSpotCategory(spot);
  const distance = formatCandidateWatchingSpotDistance(spot, t);
  const disclaimer = String(spot?.disclaimer || t("watcherMode.disclaimer")).trim();
  const attribution = sourceAttribution || t("watcherMode.attribution");
  const detailRows = [
    { label: t("preview.candidateWatchingSpotType"), value: category },
    { label: t("metrics.distance"), value: distance },
    { label: t("preview.airspaceSource"), value: "OSM" },
  ].filter((row) => row.value);

  return (
    <div className="aircraft-preview-metadata-card">
      <div className="candidate-watching-spot-preview-motion">
        <div className="relative">
          <div className="min-w-0 pr-8">
            <span className="endf-label">
              {t("preview.candidateWatchingSpotPreview")}
            </span>
            <div className="mt-1 min-w-0">
              <span
                className="notranslate block min-w-0 whitespace-normal break-words font-sans text-[14px] font-bold leading-tight text-atc-text"
                translate="no"
              >
                {name}
              </span>
            </div>
          </div>
          <Camera
            aria-hidden="true"
            className="absolute right-0 top-0 size-5 text-atc-dim"
            strokeWidth={1.8}
          />
        </div>

        {detailRows.length ? (
          <>
            <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-[10px]">
              {detailRows.map((row) => (
                <div className="contents" key={row.label}>
                  <dt className="text-atc-faint uppercase tracking-[0.1em]">
                    {row.label}
                  </dt>
                  <dd
                    className="notranslate min-w-0 truncate text-right font-semibold text-atc-text"
                    translate="no"
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}

        <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
        <p className="text-[11px] leading-snug text-atc-dim">
          {disclaimer}
        </p>
        <p className="mt-2 text-[9px] leading-tight text-atc-faint">
          {attribution}
        </p>
      </div>
    </div>
  );
}
