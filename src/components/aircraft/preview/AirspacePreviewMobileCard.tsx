import { ShieldAlert } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { resolveAirspacePreviewDisplay } from "@/features/airport/openaip/airspacePreviewDisplayModel";
import {
  MobilePreviewContent,
  MobilePreviewDetailRow,
} from "./MobilePreviewCard";
import AirspacePreviewSelector, {
  useAirspaceCarouselSwipe,
} from "./AirspacePreviewSelector";

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

  return (
    <MobilePreviewContent
      className="pointer-events-auto touch-pan-y"
      {...carouselSwipeHandlers}
    >
      <div className="flex min-w-0 items-start gap-[6px]">
        <span
          aria-label={t("preview.airspacePreview")}
          title={t("preview.airspacePreview")}
          className="mt-[1px] grid size-[18px] flex-none place-items-center text-atc-dim"
        >
          <ShieldAlert aria-hidden="true" className="size-[16px]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <span
            translate="no"
            className="notranslate block min-w-0 whitespace-normal break-words font-[var(--font-mono)] text-[18px] font-extrabold leading-[1.05] tracking-normal text-atc-text"
          >
            {name}
          </span>
        </div>
      </div>
      {display.access ? (
        <MobilePreviewDetailRow wrap>
          {display.access}
        </MobilePreviewDetailRow>
      ) : null}
      {typeAndClass ? (
        <MobilePreviewDetailRow wrap>
          {typeAndClass}
        </MobilePreviewDetailRow>
      ) : null}
      {display.vertical ? (
        <MobilePreviewDetailRow wrap>
          {display.vertical}
        </MobilePreviewDetailRow>
      ) : null}
      <AirspacePreviewSelector
        airspaces={airspaces}
        selectedAirspaceId={selectedAirspaceId}
        onSelectAirspace={onSelectAirspace}
        compact
      />
    </MobilePreviewContent>
  );
}
