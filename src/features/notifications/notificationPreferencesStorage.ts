import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from "./notificationPreferencesModel";

const STORAGE_KEY = "adsbao:notification-preferences:v1";

export function readStoredNotificationPreferences(): NotificationPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeNotificationPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredNotificationPreferences(
  preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalizeNotificationPreferences(preferences)),
    );
  } catch {
    // localStorage unavailable (private mode / quota) — in-memory still applies.
  }
}
