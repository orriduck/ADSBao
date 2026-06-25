import { Plane } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  getFlightRouteAccuracyNotice,
  getFlightRouteEndpoints,
} from "@/utils/flightRouteDisplay";

// Visual route line: ORIGIN ——✈—— DESTINATION. A hairline on each side of the
// accent plane glyph (the one place the accent appears in the route block).
// Falls back to a quiet "no route" so the header height stays stable.
export default function AircraftPreviewRouteLine({ aircraft }) {
  const { t } = useI18n();
  const route = aircraft?.flightRoute;
  const { origin, destination } = getFlightRouteEndpoints(route);
  const accuracyNotice = getFlightRouteAccuracyNotice(route)
    ? t("aircraft.adsbdbRouteAccuracyNotice")
    : "";

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
      <span className="notranslate flex-none" translate="no">
        {origin}
      </span>
      <span aria-hidden="true" className="h-px min-w-[14px] flex-1 bg-atc-line" />
      <Plane
        aria-hidden="true"
        strokeWidth={1.6}
        className="size-[15px] flex-none rotate-45 fill-current text-[var(--atc-signal-accent)] md:size-[14px]"
      />
      <span aria-hidden="true" className="h-px min-w-[14px] flex-1 bg-atc-line" />
      <span className="notranslate flex-none" translate="no">
        {destination}
      </span>
    </div>
  );
}
