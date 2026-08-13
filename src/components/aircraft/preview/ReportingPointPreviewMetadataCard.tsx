import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { MapPin } from "lucide-react";
import {
  PreviewCardHeader,
  PreviewMetaRows,
  PreviewWayfindingRail,
} from "./previewCardChrome";

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
  const rows = [
    { label: t("preview.reportingPointCountry"), value: String(point?.country || "") },
    { label: t("preview.airspaceSource"), value: source },
  ].filter((row) => row.value);

  return (
    <div className="aircraft-preview-metadata-card aircraft-preview-metadata-card--sign">
      <div className="aircraft-preview-identity-band">
        <PreviewWayfindingRail icon={<MapPin />} />
        <div className="aircraft-preview-identity-content">
          <PreviewCardHeader primary={name} primaryMono={false} secondary={kind} />
        </div>
      </div>
      <div className="aircraft-preview-detail-band">
        <PreviewMetaRows rows={rows} />
      </div>
    </div>
  );
}
