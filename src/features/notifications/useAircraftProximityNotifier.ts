import { useEffect, useRef } from "react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { formatNearbyDistanceDisplay } from "@/features/aviation/distanceDisplayModel";
import { resolveAircraftDisplayModel } from "@/features/aircraft/aircraftTypeDisplayModel";
import { showBrowserNotification } from "./browserNotificationModel";
import { selectNewlyEnteredAircraft } from "./proximityNotificationModel";

// All modes (here + airport detail): fires a system notification per
// aircraft on each new approach — crossing from outside radius to inside —
// never repeatedly while it lingers inside. Naming the callsign + aircraft
// type distinguishes this from the here-mode airport ping, which never
// repeats at all.
export function useAircraftProximityNotifier({
  enabled,
  aircraft,
  radiusNm,
}: {
  enabled: boolean;
  aircraft: Record<string, unknown>[] | null | undefined;
  radiusNm: number;
}) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const insideKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) insideKeysRef.current = new Set();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const { hits, insideKeys } = selectNewlyEnteredAircraft(
      aircraft,
      radiusNm,
      insideKeysRef.current,
    );
    insideKeysRef.current = insideKeys;
    for (const hit of hits) {
      const display = resolveAircraftDisplayModel(
        hit.aircraft as Record<string, unknown>,
      );
      const distance = formatNearbyDistanceDisplay(
        hit.distanceNm,
        units.distance,
      );
      showBrowserNotification({
        title: t("notifications.aircraftAlert.title", {
          callsign: hit.callsign,
        }),
        body: t("notifications.aircraftAlert.body", {
          type: display.shortName,
          distance: distance?.text ?? distance?.value ?? "",
          unit: distance?.unit ?? "",
        }),
        tag: `adsbao-aircraft-${hit.key}`,
      });
    }
  }, [enabled, aircraft, radiusNm, t, units.distance]);
}
