import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { resolveAirspacePreviewDisplay } from "@/features/airport/openaip/airspacePreviewDisplayModel";
import AirspacePreviewSelector from "./AirspacePreviewSelector";
import {
  MobilePreviewHeader,
  MobilePreviewIdentityBand,
  MobilePreviewMetaLine,
} from "./previewCardChrome";
import { Layers3 } from "lucide-react";

type AirspacePreviewMobileCardProps = {
  airspace?: Record<string, any> | null;
  airspaces?: Record<string, any>[] | null;
  selectedAirspaceId?: string;
  onSelectAirspace?: ((airspaceId: string) => void) | null;
};

export default function AirspacePreviewMobileCard({
  airspace,
  airspaces = null,
  selectedAirspaceId = "",
  onSelectAirspace = null,
}: AirspacePreviewMobileCardProps) {
  const { locale } = useI18n();
  const name = String(airspace?.name || "Airspace").trim();
  const display = resolveAirspacePreviewDisplay(airspace, locale);
  const typeAndClass = [display.type, display.classLabel]
    .filter(Boolean)
    .join(" / ");
  const items = [
    display.access ? <span key="access">{display.access}</span> : null,
    display.vertical ? <span key="vertical">{display.vertical}</span> : null,
  ].filter(Boolean);

  return (
    <div className="mobile-preview-sign pointer-events-auto">
      <MobilePreviewIdentityBand icon={<Layers3 />} tone="secondary">
        <MobilePreviewHeader
          primary={name}
          primaryMono={false}
          secondary={typeAndClass || undefined}
        />
      </MobilePreviewIdentityBand>
      <MobilePreviewMetaLine items={items} />
      <div className="mobile-preview-selector-row">
        <AirspacePreviewSelector
          airspaces={airspaces}
          selectedAirspaceId={selectedAirspaceId}
          onSelectAirspace={onSelectAirspace}
          compact
        />
      </div>
    </div>
  );
}
