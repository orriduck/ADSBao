import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { Layers3 } from "lucide-react";
import { resolveAirspacePreviewDisplay } from "@/features/airport/openaip/airspacePreviewDisplayModel";
import AirspacePreviewSelector from "./AirspacePreviewSelector";
import {
  PreviewCardHeader,
  PreviewMetaRows,
  PreviewWayfindingRail,
} from "./previewCardChrome";

type AirspacePreviewMetadataCardProps = {
  airspace?: Record<string, any> | null;
  airspaces?: Record<string, any>[] | null;
  selectedAirspaceId?: string;
  onSelectAirspace?: ((airspaceId: string) => void) | null;
};

export default function AirspacePreviewMetadataCard({
  airspace,
  airspaces = null,
  selectedAirspaceId = "",
  onSelectAirspace = null,
}: AirspacePreviewMetadataCardProps) {
  const { locale, t } = useI18n();
  const name = String(airspace?.name || "Airspace").trim();
  const display = resolveAirspacePreviewDisplay(airspace, locale);
  const source =
    airspace?.source === "openaip" ? "OpenAIP" : String(airspace?.source || "");
  const rows = [
    { label: t("preview.airspaceAccess"), value: display.access },
    { label: t("preview.airspaceClass"), value: display.classLabel },
    { label: t("preview.airspaceLowerLimit"), value: display.lowerLimit },
    { label: t("preview.airspaceUpperLimit"), value: display.upperLimit },
    { label: t("preview.airspaceSource"), value: source },
  ].filter((row) => row.value);

  return (
    <div className="aircraft-preview-metadata-card aircraft-preview-metadata-card--airspace pointer-events-auto">
      <div className="aircraft-preview-identity-band">
        <PreviewWayfindingRail icon={<Layers3 />} tone="secondary" />
        <div className="aircraft-preview-identity-content">
          <PreviewCardHeader
            primary={name}
            primaryMono={false}
            secondary={display.type || undefined}
          />
        </div>
      </div>
      <div className="airspace-preview-detail-band">
        <PreviewMetaRows rows={rows} />
      </div>
      {display.description ? (
        <div className="airspace-preview-description-band">
          <p className="text-[11px] leading-snug text-atc-dim">
            {display.description}
          </p>
        </div>
      ) : null}
      <div className="airspace-preview-selector-band">
        <AirspacePreviewSelector
          airspaces={airspaces}
          selectedAirspaceId={selectedAirspaceId}
          onSelectAirspace={onSelectAirspace}
        />
      </div>
    </div>
  );
}
