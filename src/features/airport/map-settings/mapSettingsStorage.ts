import {
  DEFAULT_MAP_SETTINGS,
  DEFAULT_MAP_SETTINGS_DEVICE,
  normalizeMapSettings,
  normalizeMapSettingsDevice,
} from "./mapSettingsModel";

const MAP_SETTINGS_STORAGE_KEY = "adsbao:airport-map-settings:v1";

function mapSettingsStorageKeyForDevice(device: unknown) {
  const normalizedDevice = normalizeMapSettingsDevice(device);
  return normalizedDevice === DEFAULT_MAP_SETTINGS_DEVICE
    ? MAP_SETTINGS_STORAGE_KEY
    : `${MAP_SETTINGS_STORAGE_KEY}:${normalizedDevice}`;
}

export function readStoredMapSettings(device: unknown = DEFAULT_MAP_SETTINGS_DEVICE) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(mapSettingsStorageKeyForDevice(device));
    if (!raw) return null;
    return normalizeMapSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredMapSettings(
  settings = DEFAULT_MAP_SETTINGS,
  device: unknown = DEFAULT_MAP_SETTINGS_DEVICE,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      mapSettingsStorageKeyForDevice(device),
      JSON.stringify(normalizeMapSettings(settings)),
    );
  } catch {
    // Browser storage can be unavailable; the current in-memory settings still apply.
  }
}
