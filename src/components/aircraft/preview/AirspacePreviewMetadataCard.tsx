import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { resolveAirspacePreviewDisplay } from "@/features/airport/openaip/airspacePreviewDisplayModel";
import AirspacePreviewSelector, {
  useAirspaceCarouselSwipe,
} from "./AirspacePreviewSelector";
import { PreviewCardHeader, PreviewMetaRows } from "./previewCardChrome";

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
  const carouselSwipeHandlers = useAirspaceCarouselSwipe({
    airspaces,
    selectedAirspaceId,
    onSelectAirspace,
  });

  const rows = [
    { label: t("preview.airspaceAccess"), value: display.access },
    { label: t("preview.airspaceClass"), value: display.classLabel },
    { label: t("preview.airspaceLowerLimit"), value: display.lowerLimit },
    { label: t("preview.airspaceUpperLimit"), value: display.upperLimit },
    { label: t("preview.airspaceSource"), value: source },
  ].filter((row) => row.value);

  return (
    <div
      className="aircraft-preview-metadata-card pointer-events-auto touch-pan-y"
      {...carouselSwipeHandlers}
    >
      <PreviewCardHeader
        primary={name}
        primaryMono={false}
        secondary={display.type || undefined}
      />
      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
      <PreviewMetaRows rows={rows} />
      {display.description ? (
        <>
          <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
          <p className="text-[11px] leading-snug text-atc-dim">
            {display.description}
          </p>
        </>
      ) : null}
      <AirspacePreviewSelector
        airspaces={airspaces}
        selectedAirspaceId={selectedAirspaceId}
        onSelectAirspace={onSelectAirspace}
      />
    </div>
  );
}
