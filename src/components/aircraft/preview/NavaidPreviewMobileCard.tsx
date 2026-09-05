import { toFiniteNumber } from "@/utils/math";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import {
  formatNavaidFrequency,
  formatNavaidType,
} from "./navaidPreviewFormat";
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
  const ident = String(navaid?.ident || "").trim().toUpperCase() || "—";
  const type = formatNavaidType(navaid?.type);
  const name = String(navaid?.name || "").trim();
  const distance = toFiniteNumber(navaid?.distanceNm);
  const frequency = formatNavaidFrequency(navaid?.frequencyKhz);
  const dmeChannel = String(navaid?.dme?.channel || "").trim();

  const items = [
    frequency ? <AnimatedNumber key="freq" value={frequency} /> : null,
    distance != null ? (
      <span key="dist" className="inline-flex items-baseline gap-[2px]">
        <AnimatedNumber value={distance.toFixed(1)} />
        <span translate="no" className="notranslate text-[9px] text-atc-faint">
          NM
        </span>
      </span>
    ) : null,
    dmeChannel ? <AnimatedNumber key="dme" value={dmeChannel} /> : null,
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
