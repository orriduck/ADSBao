import { Plane } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useCrossfadeCycle } from "@/components/effects/useCrossfadeCycle";
import { resolveFlightRouteProgress } from "@/features/aviation/flight-routes/flightRouteProgressModel";
import { useRouteEndpointPlaces } from "@/hooks/useRouteEndpointPlaces";
import { getFlightRouteEndpoints } from "@/utils/flightRouteDisplay";

// Visual route line: ORIGIN ——✈—— DESTINATION. A hairline on each side of the
// accent plane glyph (the one place the accent appears in the route block).
// Falls back to a quiet "no route" so the header height stays stable.
//
// When the route carries city data the endpoints
// crossfade-carousel between the IATA codes and "🇺🇸 City" place labels; the
// accent glyph and hairlines stay put so only the two labels swap.
export default function AircraftPreviewRouteLine({ aircraft }) {
  const { t } = useI18n();
  const route = aircraft?.flightRoute;
  const { origin, destination } = getFlightRouteEndpoints(route);
  const routeProgress = resolveFlightRouteProgress({ route, aircraft });
  const heading = Number(aircraft?.track);
  // Lucide's plane artwork points northeast at rest, so remove that 45°
  // baseline before applying a compass heading (0° = north).
  const planeRotation = Number.isFinite(heading) ? heading - 45 : 45;
  const places = useRouteEndpointPlaces(route);

  const hasPlaces = Boolean(places.origin && places.destination);
  const { face, fadeClass, style } = useCrossfadeCycle({ enabled: hasPlaces });
  const showPlaces = hasPlaces && face === 1;
  const originLabel = showPlaces ? places.origin : origin;
  const destinationLabel = showPlaces ? places.destination : destination;

  if (!origin || !destination) {
    const status = aircraft?.flightRouteLookupStatus;
    const label =
      status === "pending"
        ? t("aircraft.loadingRoute")
        : status === "unavailable"
          ? t("aircraft.routeUnavailable")
          : t("aircraft.noRoute");
    return (
      <span className="font-mono text-[11px] italic tracking-[0.02em] text-atc-faint md:text-[10px]">
        {label}
      </span>
    );
  }

  return (
    <div
      className="flex min-w-0 items-center gap-2.5 font-mono text-[13px] tracking-[0.06em] text-atc-dim md:gap-2 md:text-[12px]"
      title={`${origin} → ${destination}`}
    >
      <span
        className={`notranslate flex-none ${fadeClass}`}
        translate="no"
        style={style}
      >
        {originLabel}
      </span>
      <span
        aria-hidden="true"
        className="h-px min-w-[14px] flex-[1_1_0%] bg-atc-line"
        style={routeProgress == null ? undefined : { flexGrow: routeProgress }}
      />
      <Plane
        aria-hidden="true"
        strokeWidth={1.6}
        className="size-[15px] flex-none fill-current text-[var(--atc-signal-accent)] md:size-[14px]"
        style={{ transform: `rotate(${planeRotation}deg)` }}
      />
      <span
        aria-hidden="true"
        className="h-px min-w-[14px] flex-[1_1_0%] bg-atc-line"
        style={
          routeProgress == null ? undefined : { flexGrow: 1 - routeProgress }
        }
      />
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
