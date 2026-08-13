import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  MobilePreviewHeader,
  MobilePreviewIdentityBand,
  MobilePreviewMetaLine,
} from "./previewCardChrome";
import { MapPin } from "lucide-react";

type ReportingPointPreviewMobileCardProps = {
  point?: Record<string, any> | null;
};

export default function ReportingPointPreviewMobileCard({
  point,
}: ReportingPointPreviewMobileCardProps) {
  const { t } = useI18n();
  const name = String(point?.name || "—").trim();
  const kind = point?.compulsory
    ? t("preview.reportingPointCompulsory")
    : t("preview.reportingPointOptional");
  const source =
    point?.source === "openaip" ? "OpenAIP" : String(point?.source || "");
  const country = String(point?.country || "");

  const items = [
    country ? <span key="country">{country}</span> : null,
    source ? <span key="source">{source}</span> : null,
  ].filter(Boolean);

  return (
    <div className="mobile-preview-sign">
      <MobilePreviewIdentityBand icon={<MapPin />}>
        <MobilePreviewHeader primary={name} primaryMono={false} secondary={kind} />
      </MobilePreviewIdentityBand>
      <MobilePreviewMetaLine items={items} />
    </div>
  );
}
