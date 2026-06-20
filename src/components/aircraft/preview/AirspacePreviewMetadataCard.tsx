import { ShieldAlert } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { resolveAirspacePreviewDisplay } from "@/features/airport/openaip/airspacePreviewDisplayModel";
import AirspacePreviewSelector, {
  useAirspaceCarouselSwipe,
} from "./AirspacePreviewSelector";

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
  const source = airspace?.source === "openaip" ? "OpenAIP" : String(airspace?.source || "");
  const carouselSwipeHandlers = useAirspaceCarouselSwipe({
    airspaces,
    selectedAirspaceId,
    onSelectAirspace,
  });

  const detailRows = [
    { label: t("preview.airspaceType"), value: display.type },
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
      <div className="relative">
        <div className="min-w-0 pr-8">
          <span className="atc-kicker">{t("preview.airspacePreview")}</span>
          <div className="mt-1 min-w-0">
            <span
              className="notranslate block min-w-0 whitespace-normal break-words font-sans text-[14px] font-bold leading-tight text-atc-text"
              translate="no"
            >
              {name}
            </span>
          </div>
        </div>
        <ShieldAlert
          aria-hidden="true"
          className="absolute right-0 top-0 size-5 text-atc-dim"
          strokeWidth={1.8}
        />
      </div>

      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-[10px]">
        {detailRows.map((row) => (
          <div className="contents" key={row.label}>
            <dt className="text-atc-faint uppercase tracking-[0.1em]">
              {row.label}
            </dt>
            <dd
              className="notranslate min-w-0 truncate text-right font-semibold text-atc-text"
              translate="no"
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

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
