// User-pickable proximity-alert preferences. Stored client-side only (like
// unitPreferences) — browser notification permission is inherently per-device,
// so there is no server-side account sync to do here.

export const NEARBY_AIRPORT_RADIUS_PRESETS_NM = [3, 5, 10, 20] as const;
export const NEARBY_AIRCRAFT_RADIUS_PRESETS_NM = [2, 5, 10, 20] as const;

export interface NotificationPreferences {
  // Here-mode only: notify once when any airport comes within radius.
  nearbyAirportEnabled: boolean;
  nearbyAirportRadiusNm: number;
  // All modes (here + airport detail): notify per aircraft that newly enters
  // radius, with its callsign and aircraft type.
  nearbyAircraftEnabled: boolean;
  nearbyAircraftRadiusNm: number;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences =
  Object.freeze({
    nearbyAirportEnabled: false,
    nearbyAirportRadiusNm: 5,
    nearbyAircraftEnabled: false,
    nearbyAircraftRadiusNm: 5,
  });

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeRadiusNm(
  value: unknown,
  presets: readonly number[],
  fallback: number,
): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  // Clamp to the nearest preset bound rather than rejecting an off-preset
  // value outright — keeps a stored value usable even if the preset list
  // changes between releases.
  const min = presets[0];
  const max = presets[presets.length - 1];
  return Math.min(Math.max(numeric, min), max);
}

export function normalizeNotificationPreferences(
  value: unknown = DEFAULT_NOTIFICATION_PREFERENCES,
): NotificationPreferences {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    nearbyAirportEnabled: normalizeBoolean(
      record.nearbyAirportEnabled,
      DEFAULT_NOTIFICATION_PREFERENCES.nearbyAirportEnabled,
    ),
    nearbyAirportRadiusNm: normalizeRadiusNm(
      record.nearbyAirportRadiusNm,
      NEARBY_AIRPORT_RADIUS_PRESETS_NM,
      DEFAULT_NOTIFICATION_PREFERENCES.nearbyAirportRadiusNm,
    ),
    nearbyAircraftEnabled: normalizeBoolean(
      record.nearbyAircraftEnabled,
      DEFAULT_NOTIFICATION_PREFERENCES.nearbyAircraftEnabled,
    ),
    nearbyAircraftRadiusNm: normalizeRadiusNm(
      record.nearbyAircraftRadiusNm,
      NEARBY_AIRCRAFT_RADIUS_PRESETS_NM,
      DEFAULT_NOTIFICATION_PREFERENCES.nearbyAircraftRadiusNm,
    ),
  };
}

export function mergeNotificationPreferences(
  current: NotificationPreferences,
  patch: Partial<NotificationPreferences>,
): NotificationPreferences {
  return normalizeNotificationPreferences({ ...current, ...patch });
}
