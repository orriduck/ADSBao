import { Signpost } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

type ReportingPointPreviewMetadataCardProps = {
  point?: Record<string, any> | null;
};

export default function ReportingPointPreviewMetadataCard({
  point,
}: ReportingPointPreviewMetadataCardProps) {
  const { t } = useI18n();
  const name = String(point?.name || "—").trim();
  const kind = point?.compulsory
    ? t("preview.reportingPointCompulsory")
    : t("preview.reportingPointOptional");
  const source =
    point?.source === "openaip" ? "OpenAIP" : String(point?.source || "");
  const detailRows = [
    { label: t("preview.reportingPointName"), value: name },
    { label: t("preview.reportingPointType"), value: kind },
    { label: t("preview.reportingPointCountry"), value: String(point?.country || "") },
    { label: t("preview.airspaceSource"), value: source },
  ].filter((row) => row.value);

  return (
    <div className="aircraft-preview-metadata-card">
      <div className="relative">
        <div className="min-w-0 pr-8">
          <span className="atc-kicker">{t("preview.reportingPointPreview")}</span>
          <div className="mt-1 min-w-0">
            <span
              className="notranslate block min-w-0 whitespace-normal break-words font-sans text-[18px] font-bold leading-tight text-atc-text"
              translate="no"
            >
              {name}
            </span>
          </div>
        </div>
        <Signpost
          aria-hidden="true"
          className="absolute right-0 top-0 size-5 text-atc-dim"
          strokeWidth={1.8}
        />
      </div>

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
    </div>
  );
}
