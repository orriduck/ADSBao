import { Signpost } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  MobilePreviewContent,
  MobilePreviewIdentity,
  MobilePreviewMetaChip,
  MobilePreviewMetaChips,
  MobilePreviewRuleRow,
} from "./MobilePreviewCard";

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

  return (
    <MobilePreviewContent>
      <MobilePreviewIdentity
        icon={Signpost}
        label={t("preview.reportingPointPreview")}
        primary={name}
        primaryClassName="whitespace-normal break-words text-[18px] leading-[1.05]"
        secondary={kind}
      />
      {(country || source) ? (
        <MobilePreviewRuleRow
          right={
            <MobilePreviewMetaChips>
              {country ? (
                <MobilePreviewMetaChip>{country}</MobilePreviewMetaChip>
              ) : null}
              {source ? (
                <MobilePreviewMetaChip>{source}</MobilePreviewMetaChip>
              ) : null}
            </MobilePreviewMetaChips>
          }
        />
      ) : null}
    </MobilePreviewContent>
  );
}
