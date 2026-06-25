import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { resolveAirspacePreviewDisplay } from "@/features/airport/openaip/airspacePreviewDisplayModel";
import AirspacePreviewSelector, {
  useAirspaceCarouselSwipe,
} from "./AirspacePreviewSelector";
import { MobilePreviewHeader, MobilePreviewMetaLine } from "./previewCardChrome";

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
  const { locale, t } = useI18n();
  const name = String(airspace?.name || "Airspace").trim();
  const display = resolveAirspacePreviewDisplay(airspace, locale);
  const typeAndClass = [display.type, display.classLabel]
    .filter(Boolean)
    .join(" / ");
  const carouselSwipeHandlers = useAirspaceCarouselSwipe({
    airspaces,
    selectedAirspaceId,
    onSelectAirspace,
  });

  const items = [
    display.access ? <span key="access">{display.access}</span> : null,
    display.vertical ? <span key="vertical">{display.vertical}</span> : null,
  ].filter(Boolean);

  return (
    <div
      className="pointer-events-auto touch-pan-y flex flex-col gap-[6px] px-[12px] pb-[5px] pt-[10px] [[data-density=compact]_&]:px-[10px]"
      {...carouselSwipeHandlers}
    >
      <MobilePreviewHeader
        primary={name}
        primaryMono={false}
        secondary={typeAndClass || undefined}
      />
      <MobilePreviewMetaLine items={items} />
      <AirspacePreviewSelector
        airspaces={airspaces}
        selectedAirspaceId={selectedAirspaceId}
        onSelectAirspace={onSelectAirspace}
        compact
      />
    </div>
  );
}
