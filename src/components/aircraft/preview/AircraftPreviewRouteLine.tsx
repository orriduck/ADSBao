import { Plane } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useCrossfadeCycle } from "@/components/effects/useCrossfadeCycle";
import { useRouteEndpointPlaces } from "@/hooks/useRouteEndpointPlaces";
import {
  getFlightRouteAccuracyNotice,
  getFlightRouteEndpoints,
} from "@/utils/flightRouteDisplay";

// Visual route line: ORIGIN ——✈—— DESTINATION. A hairline on each side of the
// accent plane glyph (the one place the accent appears in the route block).
// Falls back to a quiet "no route" so the header height stays stable.
//
// When the route carries city data (FlightAware-enriched) the endpoints
// crossfade-carousel between the IATA codes and "🇺🇸 City" place labels; the
// accent glyph and hairlines stay put so only the two labels swap.
export default function AircraftPreviewRouteLine({ aircraft }) {
  const { t } = useI18n();
  const route = aircraft?.flightRoute;
  const { origin, destination } = getFlightRouteEndpoints(route);
  const places = useRouteEndpointPlaces(route);
  const accuracyNotice = getFlightRouteAccuracyNotice(route)
    ? t("aircraft.adsbdbRouteAccuracyNotice")
    : "";

  const hasPlaces = Boolean(places.origin && places.destination);
  const { face, fadeClass, style } = useCrossfadeCycle({ enabled: hasPlaces });
  const showPlaces = hasPlaces && face === 1;
  const originLabel = showPlaces ? places.origin : origin;
  const destinationLabel = showPlaces ? places.destination : destination;

  if (!origin || !destination) {
    return (
      <span className="font-mono text-[11px] italic tracking-[0.02em] text-atc-faint md:text-[10px]">
        {t("aircraft.noRoute")}
      </span>
    );
  }

  return (
    <div
      className="flex min-w-0 items-center gap-2.5 font-mono text-[13px] tracking-[0.06em] text-atc-dim md:gap-2 md:text-[12px]"
      title={accuracyNotice || `${origin} → ${destination}`}
    >
      <span
        className={`notranslate flex-none ${fadeClass}`}
        translate="no"
        style={style}
      >
        {originLabel}
      </span>
      <span aria-hidden="true" className="h-px min-w-[14px] flex-1 bg-atc-line" />
      <Plane
        aria-hidden="true"
        strokeWidth={1.6}
        className="size-[15px] flex-none rotate-45 fill-current text-[var(--atc-signal-accent)] md:size-[14px]"
      />
      <span aria-hidden="true" className="h-px min-w-[14px] flex-1 bg-atc-line" />
      <span
        className={`notranslate flex-none ${fadeClass}`}
        translate="no"
        style={style}
      >
        {destinationLabel}
      </span>
    </div>
  );
}
