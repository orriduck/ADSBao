import { useEffect, useRef } from "react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { formatNearbyDistanceDisplay } from "@/features/aviation/distanceDisplayModel";
import { showBrowserNotification } from "./browserNotificationModel";
import { selectAirportProximityHit } from "./proximityNotificationModel";

// Here-mode only: fires ONE system notification for the whole enabled
// session as soon as any airport comes within radius, then goes quiet — this
// is a "you've wandered near an airport" ping, not a running feed. Toggling
// the setting off and back on re-arms it.
export function useAirportProximityNotifier({
  enabled,
  airports,
  radiusNm,
}: {
  enabled: boolean;
  airports: Record<string, unknown>[] | null | undefined;
  radiusNm: number;
}) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const firedRef = useRef(false);

  useEffect(() => {
    if (enabled) firedRef.current = false;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || firedRef.current) return;
    const hit = selectAirportProximityHit(airports, radiusNm);
    if (!hit) return;
    firedRef.current = true;
    const distance = formatNearbyDistanceDisplay(hit.distanceNm, units.distance);
    showBrowserNotification({
      title: t("notifications.airportAlert.title", {
        name: hit.name || hit.icao,
      }),
      body: t("notifications.airportAlert.body", {
        icao: hit.icao,
        distance: distance?.text ?? distance?.value ?? "",
        unit: distance?.unit ?? "",
      }),
      tag: `adsbao-airport-${hit.key}`,
    });
  }, [enabled, airports, radiusNm, t, units.distance]);
}
