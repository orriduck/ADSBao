import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { RadioTower } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { toFiniteNumber } from "@/utils/math";
import {
  formatNavaidFrequency,
  formatNavaidType,
  formatNavaidVariation,
} from "./navaidPreviewFormat";
import {
  PreviewCardHeader,
  PreviewMetaRows,
  PreviewWayfindingRail,
} from "./previewCardChrome";

type NavaidPreviewMetadataCardProps = {
  navaid?: Record<string, any> | null;
};

export default function NavaidPreviewMetadataCard({
  navaid,
}: NavaidPreviewMetadataCardProps) {
  const { t } = useI18n();
  const ident = String(navaid?.ident || "").trim().toUpperCase() || "—";
  const type = formatNavaidType(navaid?.type);
  const name = String(navaid?.name || "").trim();
  const distance = toFiniteNumber(navaid?.distanceNm);
  const elevation = toFiniteNumber(navaid?.elevationFt);
  const frequency = formatNavaidFrequency(navaid?.frequencyKhz);
  const dmeFrequency = formatNavaidFrequency(navaid?.dme?.frequencyKhz);
  const dmeChannel = String(navaid?.dme?.channel || "").trim();
  const usage = String(navaid?.usageType || "").trim();
  const power = String(navaid?.power || "").trim();
  const associatedAirport = String(navaid?.associatedAirport || "")
    .trim()
    .toUpperCase();
  const variation =
    formatNavaidVariation(navaid?.magneticVariationDeg) ||
    formatNavaidVariation(navaid?.slavedVariationDeg);

  const rows = [
    {
      label: t("metrics.distance"),
      value:
        distance == null ? (
          "—"
        ) : (
          <>
            <AnimatedNumber
              value={distance}
              format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
            />
            <span className="notranslate" translate="no">
              {" "}
              NM
            </span>
          </>
        ),
    },
    {
      label: t("metrics.elevation"),
      value:
        elevation == null ? (
          "—"
        ) : (
          <>
            <AnimatedNumber value={Math.round(elevation)} />
            <span className="notranslate" translate="no">
              {" "}
              FT
            </span>
          </>
        ),
    },
    { label: t("metrics.frequency"), value: frequency },
    {
      label: t("metrics.dme"),
      value: [dmeChannel, dmeFrequency].filter(Boolean).join(" · "),
    },
    { label: t("metrics.usage"), value: usage },
    { label: t("metrics.power"), value: power },
    { label: t("metrics.associated"), value: associatedAirport },
    { label: t("metrics.variation"), value: variation },
  ].filter((row) => row.value);

  return (
    <div className="aircraft-preview-metadata-card aircraft-preview-metadata-card--sign">
      <div className="aircraft-preview-identity-band">
        <PreviewWayfindingRail icon={<RadioTower />} />
        <div className="aircraft-preview-identity-content">
          <PreviewCardHeader
            primary={ident}
            secondary={type || undefined}
            sublines={[name]}
          />
        </div>
      </div>
      <div className="aircraft-preview-detail-band">
        <PreviewMetaRows rows={rows} />
      </div>
    </div>
  );
}
