import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { MobilePreviewHeader, MobilePreviewMetaLine } from "./previewCardChrome";

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
    <div className="flex flex-col gap-[7px] px-[12px] pb-[6px] pt-[10px] [[data-density=compact]_&]:px-[10px]">
      <MobilePreviewHeader primary={name} primaryMono={false} secondary={kind} />
      <MobilePreviewMetaLine items={items} />
    </div>
  );
}
