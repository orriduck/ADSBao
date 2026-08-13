import { toFiniteNumber } from "@/utils/math";
import {
  formatNavaidFrequency,
  formatNavaidType,
} from "./navaidPreviewFormat";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  MobilePreviewHeader,
  MobilePreviewIdentityBand,
  MobilePreviewMetaLine,
} from "./previewCardChrome";
import { RadioTower } from "lucide-react";

type NavaidPreviewMobileCardProps = {
  navaid?: Record<string, any> | null;
};

export default function NavaidPreviewMobileCard({
  navaid,
}: NavaidPreviewMobileCardProps) {
  const { t } = useI18n();
  const ident = String(navaid?.ident || "").trim().toUpperCase() || "—";
  const type = formatNavaidType(navaid?.type);
  const name = String(navaid?.name || "").trim();
  const distance = toFiniteNumber(navaid?.distanceNm);
  const frequency = formatNavaidFrequency(navaid?.frequencyKhz);
  const dmeChannel = String(navaid?.dme?.channel || "").trim();

  const items = [
    frequency ? <span key="freq">{frequency}</span> : null,
    distance != null ? (
      <span key="dist" className="inline-flex items-baseline gap-[2px]">
        {distance.toFixed(1)}
        <span translate="no" className="notranslate text-[9px] text-atc-faint">
          NM
        </span>
      </span>
    ) : null,
    dmeChannel ? <span key="dme">{dmeChannel}</span> : null,
  ].filter(Boolean);

  return (
    <div className="mobile-preview-sign">
      <MobilePreviewIdentityBand icon={<RadioTower />}>
        <MobilePreviewHeader
          primary={ident}
          secondary={type || undefined}
          subline={name || undefined}
        />
      </MobilePreviewIdentityBand>
      <MobilePreviewMetaLine items={items} />
    </div>
  );
}
